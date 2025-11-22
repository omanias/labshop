import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ProductsService } from '../products/products.service';
import { CartsService } from '../carts/carts.service';
import { Product } from '../entities/product.entity';

@Injectable()
export class GeminiService {
    private readonly ai: GoogleGenAI;
    private readonly REQUEST_TIMEOUT = 30000; // 30 segundos timeout

    constructor(
        private readonly productsService: ProductsService,
        private readonly cartsService: CartsService,
    ) {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GOOGLE_API_KEY,
        });
    }

    async generateText(prompt: string): Promise<string> {
        try {
            console.log('[GEMINI] Calling API with prompt length:', prompt.length);

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            if (!response) {
                console.error('[GEMINI] ❌ Empty response from API');
                return 'Lo siento, no pude procesar tu solicitud. Intenta de nuevo.';
            }

            if (!response.text) {
                console.error('[GEMINI] ❌ No text in response. Full response:', JSON.stringify(response));
                return 'Lo siento, no pude procesar tu solicitud. Intenta de nuevo.';
            }

            console.log('[GEMINI] ✅ Response received, length:', response.text.length);
            return response.text;
        } catch (error: any) {
            console.error('[GEMINI] ❌ API Error:', {
                message: error.message,
                code: error.code,
                status: error.status,
                details: error.details,
            });

            // Handle specific error types
            if (error.message?.includes('quota')) {
                return 'He alcanzado el límite de solicitudes. Intenta en unos minutos.';
            }
            if (error.message?.includes('timeout')) {
                return 'La solicitud tardó demasiado. Intenta de nuevo.';
            }

            return 'Lo siento, no pude procesar tu solicitud. Intenta de nuevo.';
        }
    }

    async queryProducts(query: string): Promise<{ response: string; products: Product[] }> {
        try {
            console.log('[GEMINI] queryProducts called with:', query.substring(0, 100));

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

            const enhancedPrompt = `Eres un asistente de ventas amigable y útil para una tienda de ropa. 

CATÁLOGO DE PRODUCTOS DISPONIBLES:
${productsContext}

PREGUNTA DEL CLIENTE: "${query}"

INSTRUCCIONES:
1. Si la pregunta es sobre productos específicos (ej: "¿qué camisas tienen?", "tienen pantalones?"):
   - Recomienda productos relevantes del catálogo
   - Sé BREVE (máximo 80 palabras)
   - AL FINAL incluye: "PRODUCT_IDS: [id1, id2, id3, ...]" con los IDs recomendados

2. Si es una pregunta general (ej: "¿cómo compro?", "¿hacen envíos?", "¿cuál es el horario?"):
   - Responde de forma útil y amigable
   - Máximo 60 palabras
   - NO incluyas PRODUCT_IDS
   - Orienta al cliente sobre cómo usar el sistema

3. Si es un saludo o conversación casual:
   - Responde cordialmente
   - Ofrece ayuda
   - NO incluyas PRODUCT_IDS

Responde en español, sé conciso y profesional.`;

            const response = await this.generateText(enhancedPrompt);

            if (!response || response.length === 0) {
                console.warn('[GEMINI] Empty response from generateText');
                return {
                    response: 'No pude procesar tu consulta. Intenta de nuevo.',
                    products: [],
                };
            }

            // Extraer los IDs de productos de la respuesta
            const idMatch = response.match(/PRODUCT_IDS:\s*\[([^\]]+)\]/);
            let recommendedProducts: Product[] = [];

            if (idMatch) {
                const ids = idMatch[1]
                    .split(',')
                    .map((id) => parseInt(id.trim(), 10))
                    .filter((id) => !isNaN(id));

                recommendedProducts = allProducts.filter((p) => ids.includes(p.id));
                console.log('[GEMINI] Extracted product IDs:', ids);
            } else {
                // Fallback: si no hay IDs explícitos, buscar por palabras clave
                const queryLower = query.toLowerCase();
                const productKeywords = ['camisa', 'pantalon', 'remera', 'buzo', 'medias', 'producto'];
                const hasProductKeyword = productKeywords.some(kw => queryLower.includes(kw));

                if (hasProductKeyword) {
                    recommendedProducts = allProducts
                        .filter(
                            (p) =>
                                p.tipo_prenda.toLowerCase().includes(queryLower) ||
                                p.color.toLowerCase().includes(queryLower) ||
                                p.categoria.toLowerCase().includes(queryLower),
                        )
                        .slice(0, 5);
                    console.log('[GEMINI] No explicit IDs found, using fallback matching');
                } else {
                    console.log('[GEMINI] General query detected, no product filtering');
                }
            }

            const cleanedResponse = response.replace(/PRODUCT_IDS:\s*\[([^\]]+)\]/g, '').trim();

            return {
                response: cleanedResponse,
                products: recommendedProducts,
            };
        } catch (error: any) {
            console.error('[GEMINI] Error in queryProducts:', {
                message: error.message,
                stack: error.stack,
            });
            return {
                response: 'Ocurrió un error al procesar tu solicitud. Intenta de nuevo.',
                products: [],
            };
        }
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
            const cartDetail = cart ? await this.cartsService.getCartDetail(cart.id) : null;

            if (!cartDetail) {
                console.error('[GEMINI] Cart created but could not retrieve details');
                return {
                    response: '❌ Error creating cart. Please try again.',
                    cart: null,
                };
            }

            const cartMessage = `
✅ **¡Carrito creado exitosamente!**

**ID del Carrito: #${cartDetail?.id}**

He agregado ${products.length} producto(s) a tu carrito:
${products.map((p) => `- ${p.tipo_prenda} (${p.color}, Talla: ${p.talla}) - Precio: $${p.precio_50_u} x ${quantity}`).join('\n')}

**Total de artículos:** ${cartItems.length}
**Total de compra: $${cartDetail?.total.toFixed(2)}**

¿Deseas proceder al pago o necesitas hacer cambios en tu carrito?`;

            return {
                response: cartMessage,
                cart: cartDetail,
            };
        } catch (error) {
            console.error('[GEMINI] Error creating cart:', error.message);
            return {
                response: `❌ Error al crear tu carrito: ${error.message}`,
                cart: null,
            };
        }
    }

    async queryCartProducts(cartId: number, query: string): Promise<{ response: string; cart: any }> {
        try {
            const cartDetail = await this.cartsService.getCartDetail(cartId);

            if (!cartDetail || cartDetail.items.length === 0) {
                return {
                    response: 'Tu carrito está vacío. ¿Qué productos te gustaría agregar?',
                    cart: null,
                };
            }

            const cartContext = cartDetail.items
                .map((item) => {
                    return `- Producto ID: ${item.productId} | ${item.product.tipo_prenda} | Talla: ${item.product.talla} | Color: ${item.product.color} | Cantidad: ${item.qty} | Precio unitario: $${item.product.precio_unitario} | Subtotal: $${item.subtotal}`;
                })
                .join('\n');

            const prompt = `Eres un asistente de ventas experto. El cliente tiene los siguientes productos en su carrito:

${cartContext}

**ID del Carrito: #${cartDetail.id}**
**Total del carrito: $${cartDetail.total.toFixed(2)}**

El cliente pregunta: "${query}"

Por favor, responde sobre sus productos en el carrito de manera clara y útil. Si pregunta sobre modificaciones (cantidad, eliminación), oriéntalo sobre cómo hacerlo pero no realices cambios.`;

            const response = await this.generateText(prompt);

            return {
                response,
                cart: cartDetail,
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
    ): Promise<{ response: string; cart: any }> {
        try {
            console.log('[GEMINI] Editing cart:', { cartId, query });

            const currentCart = await this.cartsService.getCartDetail(cartId);

            if (!currentCart) {
                return {
                    response: 'Carrito no encontrado.',
                    cart: null,
                };
            }

            const cartContext = currentCart.items
                .map((item) => `- ID: ${item.productId} | ${item.product.tipo_prenda} (${item.product.color}, ${item.product.talla}) | Cantidad: ${item.qty}`)
                .join('\n');

            const prompt = `
Eres un asistente inteligente que gestiona un carrito de compras.
Tu trabajo es interpretar la intención del usuario y devolver una respuesta estructurada en JSON.

ESTADO ACTUAL DEL CARRITO:
${cartContext}

SOLICITUD DEL USUARIO: "${query}"

INSTRUCCIONES:
1. Analiza si el usuario quiere ELIMINAR un producto o CAMBIAR LA CANTIDAD.
2. Identifica qué producto (por ID o descripción) y la nueva cantidad (si aplica).
3. Si quiere eliminar, la cantidad es 0.
4. Si no entiendes la solicitud o no coincide con ningún producto, marca "action" como "NONE".

Debes responder ÚNICAMENTE con un JSON válido con este formato:
{
  "action": "UPDATE" | "NONE",
  "updates": [
    {
      "product_id": number,
      "qty": number
    }
  ],
  "reasoning": "Breve explicación de qué entendiste"
}
`;

            const llmResponse = await this.generateText(prompt);
            console.log('[GEMINI] LLM Response for editCart:', llmResponse);

            const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('[GEMINI] Could not parse JSON from LLM response');
                return {
                    response: 'No entendí bien qué quieres cambiar en el carrito. ¿Podrías repetirlo?',
                    cart: currentCart,
                };
            }

            const parsedAction = JSON.parse(jsonMatch[0]);

            if (parsedAction.action === 'NONE' || !parsedAction.updates || parsedAction.updates.length === 0) {
                return {
                    response: 'No estoy seguro de a qué producto te refieres. ¿Podrías ser más específico?',
                    cart: currentCart,
                };
            }

            let newItems = [...currentCart.items.map((item) => ({
                product_id: item.productId,
                qty: item.qty,
            }))];

            for (const update of parsedAction.updates) {
                const existingItemIndex = newItems.findIndex(i => i.product_id === update.product_id);

                if (update.qty <= 0) {
                    if (existingItemIndex >= 0) {
                        newItems.splice(existingItemIndex, 1);
                    }
                } else {
                    if (existingItemIndex >= 0) {
                        newItems[existingItemIndex].qty = update.qty;
                    } else {
                        console.warn('[GEMINI] LLM tried to update item not in cart:', update.product_id);
                    }
                }
            }

            const updatedCart = await this.cartsService.updateCart(cartId, { items: newItems });
            const updatedCartDetail = await this.cartsService.getCartDetail(cartId);

            const responseText = `
✅ **¡Carrito actualizado!**

${updatedCartDetail.items.length === 0 ? 'Tu carrito está vacío.' : '**Tu carrito ahora contiene:**'}
${updatedCartDetail.items.map((item) => `- ${item.product.tipo_prenda} (${item.product.color}) - Cantidad: ${item.qty} - $${item.subtotal.toFixed(2)}`).join('\n')}

**Total: $${updatedCartDetail.total.toFixed(2)}**

¿Algo más?`;

            return {
                response: responseText,
                cart: updatedCartDetail,
            };

        } catch (error) {
            console.error('[GEMINI] Error editing cart:', error);
            return {
                response: 'Ocurrió un problema al actualizar tu carrito. Intenta de nuevo.',
                cart: null,
            };
        }
    }

    /**
     * Intelligent message processor that uses Gemini to understand user intent
     * and route to the appropriate handler
     */
    async processUserMessage(message: string): Promise<{
        response: string;
        cart?: any;
        products?: Product[];
    }> {
        try {
            console.log('[GEMINI] Processing user message:', message.substring(0, 100));

            // First, use Gemini to detect intent
            const intentPrompt = `Eres un asistente inteligente que analiza mensajes de clientes de una tienda de ropa.

MENSAJE DEL CLIENTE: "${message}"

Analiza el mensaje y determina la INTENCIÓN principal. Responde ÚNICAMENTE con un JSON válido:

{
  "intent": "QUERY_PRODUCTS" | "CREATE_CART" | "MODIFY_CART" | "VIEW_CART" | "GENERAL_QUESTION" | "GREETING",
  "cart_id": number | null,
  "reasoning": "breve explicación"
}

INTENCIONES:
- QUERY_PRODUCTS: Pregunta sobre productos disponibles (ej: "¿qué camisas tienen?")
- CREATE_CART: Quiere comprar/agregar productos (ej: "quiero 2 camisas azules", "comprar pantalones")
- MODIFY_CART: Quiere modificar un carrito existente (ej: "elimina el producto 1 del carrito #8", "cambia cantidad")
- VIEW_CART: Quiere ver su carrito (ej: "muéstrame mi carrito #8", "qué tengo en el carrito")
- GENERAL_QUESTION: Pregunta general sobre la tienda (ej: "¿cómo compro?", "hacen envíos?")
- GREETING: Saludo o conversación casual (ej: "hola", "gracias")

Si menciona un número de carrito con # o "carrito", extrae el cart_id.`;

            const intentResponse = await this.generateText(intentPrompt);
            console.log('[GEMINI] Intent analysis:', intentResponse);

            // Parse intent
            const jsonMatch = intentResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('[GEMINI] Could not parse intent JSON, defaulting to query');
                return await this.queryProducts(message);
            }

            const intent = JSON.parse(jsonMatch[0]);
            console.log('[GEMINI] Detected intent:', intent);

            // Route based on intent
            switch (intent.intent) {
                case 'CREATE_CART':
                    const purchaseResult = await this.processPurchaseIntent(message, 1);
                    return {
                        response: purchaseResult.response,
                        cart: purchaseResult.cart,
                    };

                case 'MODIFY_CART':
                    if (!intent.cart_id) {
                        return {
                            response: 'Para modificar tu carrito, necesito el número de carrito. Por favor menciona el carrito con #número (ej: carrito #8)',
                        };
                    }
                    const editResult = await this.editCart(intent.cart_id, message);
                    return {
                        response: editResult.response,
                        cart: editResult.cart,
                    };

                case 'VIEW_CART':
                    if (!intent.cart_id) {
                        return {
                            response: 'Para ver tu carrito, necesito el número. Por favor menciona el carrito con #número (ej: carrito #8)',
                        };
                    }
                    const cartDetail = await this.cartsService.getCartDetail(intent.cart_id);
                    const cartMessage = `
🛒 **Carrito #${cartDetail.id}**

${cartDetail.items.length === 0 ? 'Tu carrito está vacío.' : '**Productos:**'}
${cartDetail.items.map((item) => `- ${item.product.tipo_prenda} (${item.product.color}, Talla: ${item.product.talla}) x${item.qty} - $${item.subtotal.toFixed(2)}`).join('\n')}

**Total: $${cartDetail.total.toFixed(2)}**
**Cantidad de items: ${cartDetail.itemCount}**

¿Deseas modificar algo?`;
                    return {
                        response: cartMessage,
                        cart: cartDetail,
                    };

                case 'QUERY_PRODUCTS':
                    const queryResult = await this.queryProducts(message);
                    return {
                        response: queryResult.response,
                        products: queryResult.products,
                    };

                case 'GENERAL_QUESTION':
                case 'GREETING':
                default:
                    const generalResult = await this.queryProducts(message);
                    return {
                        response: generalResult.response,
                        products: generalResult.products,
                    };
            }
        } catch (error: any) {
            console.error('[GEMINI] Error processing user message:', error);
            return {
                response: 'Ocurrió un error al procesar tu mensaje. ¿Podrías intentar de nuevo?',
            };
        }
    }
}
