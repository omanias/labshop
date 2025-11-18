import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ProductsService } from '../products/products.service';
import { CartsService } from '../carts/carts.service';
import { Product } from '../entities/product.entity';

@Injectable()
export class GeminiService {
    private readonly ai: GoogleGenAI;

    constructor(
        private readonly productsService: ProductsService,
        private readonly cartsService: CartsService,
    ) {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GOOGLE_API_KEY,
        });
    }

    async generateText(prompt: string): Promise<string> {
        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text ?? '';
    }

    async queryProducts(query: string): Promise<{ response: string; products: Product[] }> {
        const allProducts = await this.productsService.findAll();

        if (allProducts.length === 0) {
            return {
                response: 'Disculpa, en este momento no tengo productos disponibles en el catálogo.',
                products: [],
            };
        }

        const productsContext = allProducts
            .map((p) => `ID: ${p.id} | Tipo: ${p.tipo_prenda} | Talla: ${p.talla} | Color: ${p.color} | Categoria: ${p.categoria} | Descripcion: ${p.descripcion} | Precio 50u: $${p.precio_50_u} | Disponible: ${p.disponible}`)
            .join('\n');

        const enhancedPrompt = `Eres un asistente de ventas BREVE. Aquí está el catálogo de productos disponibles:

${productsContext}

El cliente pregunta: "${query}"

Por favor (MÁXIMO 100 palabras, SÉ CONCISO):
1. Recomienda productos relevantes del catálogo
2. Una breve explicación (1-2 líneas)
3. AL FINAL, incluye esta línea exactamente: "PRODUCT_IDS: [id1, id2, id3, ...]" con los IDs de los productos recomendados.`;

        const response = await this.generateText(enhancedPrompt);

        // Extraer los IDs de productos de la respuesta
        const idMatch = response.match(/PRODUCT_IDS:\s*\[([^\]]+)\]/);
        let recommendedProducts: Product[] = [];

        if (idMatch) {
            const ids = idMatch[1]
                .split(',')
                .map((id) => parseInt(id.trim(), 10))
                .filter((id) => !isNaN(id));

            recommendedProducts = allProducts.filter((p) => ids.includes(p.id));
        } else {
            const queryLower = query.toLowerCase();
            recommendedProducts = allProducts
                .filter(
                    (p) =>
                        p.tipo_prenda.toLowerCase().includes(queryLower) ||
                        p.color.toLowerCase().includes(queryLower) ||
                        p.categoria.toLowerCase().includes(queryLower),
                )
                .slice(0, 5);
        }

        const cleanedResponse = response.replace(/PRODUCT_IDS:\s*\[([^\]]+)\]/g, '').trim();

        return {
            response: cleanedResponse,
            products: recommendedProducts,
        };
    }

    async processPurchaseIntent(query: string, quantity: number = 1): Promise<{ response: string; cart: any }> {
        const { response, products } = await this.queryProducts(query);

        const purchaseKeywords = ['comprar', 'quiero', 'necesito', 'voy a', 'dame', 'llevo', 'agregar', 'añadir', 'llevar'];
        const hasPurchaseIntent = purchaseKeywords.some((keyword) => query.toLowerCase().includes(keyword));

        if (!hasPurchaseIntent || products.length === 0) {
            return {
                response,
                cart: null,
            };
        }

        const cartItems = products.map((p) => ({
            product_id: p.id,
            qty: quantity,
        }));

        try {
            const cart = await this.cartsService.createCart({ items: cartItems });

            const cartMessage = `
✅ **¡Carrito creado exitosamente!**

He agregado ${products.length} producto(s) a tu carrito:
${products.map((p) => `- ${p.tipo_prenda} (${p.color}, Talla: ${p.talla}) - Precio: $${p.precio_50_u} x ${quantity}`).join('\n')}

**Total de artículos:** ${cartItems.length}

¿Deseas proceder al pago o necesitas hacer cambios en tu carrito?`;

            return {
                response: cartMessage,
                cart,
            };
        } catch (error) {
            return {
                response: `Hubo un error al crear tu carrito: ${error.message}`,
                cart: null,
            };
        }
    }

    async queryCartProducts(cartId: number, query: string): Promise<{ response: string; cart: any }> {
        try {
            const cart = await this.cartsService.getCart(cartId);

            if (!cart || cart.items.length === 0) {
                return {
                    response: 'Tu carrito está vacío. ¿Qué productos te gustaría agregar?',
                    cart: null,
                };
            }

            const cartContext = cart.items
                .map((item) => {
                    const p = item.product;
                    return `- ID: ${p.id} | ${p.tipo_prenda} | Talla: ${p.talla} | Color: ${p.color} | Cantidad: ${item.qty} | Precio unitario: $${p.precio_50_u}`;
                })
                .join('\n');

            const cartTotal = cart.items.reduce((sum, item) => {
                return sum + parseFloat(item.product.precio_50_u.toString()) * item.qty;
            }, 0);

            const prompt = `Eres un asistente de ventas experto. El cliente tiene los siguientes productos en su carrito:

${cartContext}

**Total del carrito: $${cartTotal.toFixed(2)}**

El cliente pregunta: "${query}"

Por favor, responde sobre sus productos en el carrito de manera clara y útil. Si pregunta sobre modificaciones (cantidad, eliminación), oriéntalo sobre cómo hacerlo pero no realices cambios.`;

            const response = await this.generateText(prompt);

            return {
                response,
                cart,
            };
        } catch (error) {
            return {
                response: `Error al consultar tu carrito: ${error.message}`,
                cart: null,
            };
        }
    }

    async editCart(
        cartId: number,
        query: string,
        updates?: { product_id: number; qty: number }[],
    ): Promise<{ response: string; cart: any }> {
        try {
            const currentCart = await this.cartsService.getCart(cartId);

            if (!currentCart) {
                return {
                    response: 'Carrito no encontrado.',
                    cart: null,
                };
            }

            let newItems = [...currentCart.items.map((item) => ({
                product_id: item.product.id,
                qty: item.qty,
            }))];

            if (updates && updates.length > 0) {
                newItems = updates;
            } else {
                const queryLower = query.toLowerCase();

                const removeMatch = queryLower.match(/elimina|quita|remove|borr[ao].*?(\d+)/);
                if (removeMatch) {
                    const productId = parseInt(removeMatch[1], 10);
                    newItems = newItems.filter((item) => item.product_id !== productId);
                }

                const qtyMatch = queryLower.match(/cambiar?.*?cantidad|de (\d+).*?a (\d+)|(\d+).*?en lugar de|cantidad de (\d+)/);
                if (qtyMatch) {
                    const detailedMatch = queryLower.match(/product[o]?\s+(\d+).*?(\d+)/);
                    if (detailedMatch) {
                        const productId = parseInt(detailedMatch[1], 10);
                        const newQty = parseInt(detailedMatch[2], 10);
                        const itemIndex = newItems.findIndex((item) => item.product_id === productId);
                        if (itemIndex >= 0) {
                            newItems[itemIndex].qty = newQty;
                        }
                    }
                }

                const addMatch = queryLower.match(/agrega|añad[ei]|add.*?(\d+)/);
                if (addMatch && !queryLower.includes('cantidad')) {
                    const productId = parseInt(addMatch[1], 10);
                    const existingItem = newItems.find((item) => item.product_id === productId);
                    if (existingItem) {
                        existingItem.qty += 1;
                    } else {
                        newItems.push({ product_id: productId, qty: 1 });
                    }
                }
            }

            const updatedCart = await this.cartsService.updateCart(cartId, { items: newItems });

            if (!updatedCart) {
                return {
                    response: 'Error al actualizar el carrito.',
                    cart: null,
                };
            }

            const responseText = `
✅ **¡Carrito actualizado correctamente!**

**Tu carrito ahora contiene:**
${updatedCart.items.map((item) => `- ${item.product.tipo_prenda} (${item.product.color}) - Cantidad: ${item.qty} - $${parseFloat(item.product.precio_50_u.toString()) * item.qty}`).join('\n')}

**Total: $${updatedCart.items.reduce((sum, item) => sum + parseFloat(item.product.precio_50_u.toString()) * item.qty, 0).toFixed(2)}**

¿Hay algo más que quieras modificar?`;

            return {
                response: responseText,
                cart: updatedCart,
            };
        } catch (error) {
            return {
                response: `Error al actualizar tu carrito: ${error.message}`,
                cart: null,
            };
        }
    }
}
