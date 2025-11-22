import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ProductsService } from '../products/products.service';
import { CartsService } from '../carts/carts.service';
import { Product } from '../entities/product.entity';

interface UserSession {
    userId: string;
    activeCartId: number | null;
    messageHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
    lastActivity: Date;
}

@Injectable()
export class GeminiService {
    private readonly ai: GoogleGenAI;
    private readonly REQUEST_TIMEOUT = 30000;
    private readonly sessions: Map<string, UserSession> = new Map();
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000;

    constructor(
        private readonly productsService: ProductsService,
        private readonly cartsService: CartsService,
    ) {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GOOGLE_API_KEY,
        });

        setInterval(() => this.cleanExpiredSessions(), 10 * 60 * 1000);
    }

    private cleanExpiredSessions() {
        const now = Date.now();
        for (const [userId, session] of this.sessions.entries()) {
            if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
                this.sessions.delete(userId);
                console.log('[GEMINI] Session expired for user:', userId);
            }
        }
    }

    private getOrCreateSession(userId: string): UserSession {
        let session = this.sessions.get(userId);
        if (!session) {
            session = {
                userId,
                activeCartId: null,
                messageHistory: [],
                lastActivity: new Date(),
            };
            this.sessions.set(userId, session);
            console.log('[GEMINI] New session created for user:', userId);
        } else {
            session.lastActivity = new Date();
        }
        return session;
    }

    private addToHistory(userId: string, role: 'user' | 'assistant', content: string) {
        const session = this.getOrCreateSession(userId);
        session.messageHistory.push({
            role,
            content,
            timestamp: new Date(),
        });
        if (session.messageHistory.length > 20) {
            session.messageHistory = session.messageHistory.slice(-20);
        }
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

            const allProducts = await this.productsService.findAll();
            const productsContext = allProducts
                .map((p) => `ID: ${p.id} | ${p.tipo_prenda} | Talla: ${p.talla} | Color: ${p.color} | Precio: $${p.precio_50_u}`)
                .join('\n');

            const prompt = `
Eres un asistente inteligente que gestiona un carrito de compras.

ESTADO ACTUAL DEL CARRITO:
${cartContext || 'Carrito vacío'}

CATÁLOGO DE PRODUCTOS DISPONIBLES:
${productsContext}

SOLICITUD DEL USUARIO: "${query}"

INSTRUCCIONES:
1. Si el usuario quiere AGREGAR un producto que NO está en el carrito, búscalo en el catálogo y agrégalo
2. Si el usuario quiere MODIFICAR la cantidad de un producto existente, actualízalo
3. Si el usuario quiere ELIMINAR un producto, pon qty en 0
4. Si no entiendes la solicitud, marca "action" como "NONE"

Responde ÚNICAMENTE con un JSON válido:
{
  "action": "UPDATE" | "NONE",
  "updates": [
    {
      "product_id": number,
      "qty": number
    }
  ],
  "reasoning": "Breve explicación"
}

IMPORTANTE:
- Si dice "agregar" o "añadir", busca el producto en el CATÁLOGO (no en el carrito)
- Si dice "cambiar cantidad" o "modificar", busca en el CARRITO
- Si dice "eliminar" o "quitar", pon qty: 0
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
                        const productExists = allProducts.find(p => p.id === update.product_id);
                        if (productExists) {
                            newItems.push({
                                product_id: update.product_id,
                                qty: update.qty,
                            });
                            console.log('[GEMINI] Adding new product to cart:', update.product_id);
                        } else {
                            console.warn('[GEMINI] Product not found in catalog:', update.product_id);
                        }
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

    async processUserMessage(message: string, userId: string): Promise<{
        response: string;
        cart?: any;
        products?: Product[];
    }> {
        try {
            console.log('[GEMINI] Processing user message:', message.substring(0, 100));

            const session = this.getOrCreateSession(userId);
            this.addToHistory(userId, 'user', message);

            const conversationContext = session.messageHistory
                .slice(-10)
                .map((msg) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
                .join('\n');

            const intentPrompt = `Eres un asistente inteligente que analiza mensajes de clientes de una tienda de ropa.

${conversationContext ? `CONTEXTO DE LA CONVERSACIÓN:\n${conversationContext}\n\n` : ''}
${session.activeCartId ? `CARRITO ACTIVO: #${session.activeCartId}\n\n` : ''}
MENSAJE ACTUAL DEL CLIENTE: "${message}"

Analiza el mensaje y determina la INTENCIÓN principal. Responde ÚNICAMENTE con un JSON válido:

{
  "intent": "QUERY_PRODUCTS" | "CREATE_CART" | "MODIFY_CART" | "VIEW_CART" | "GENERAL_QUESTION" | "GREETING",
  "cart_id": number | null,
  "reasoning": "breve explicación"
}

INTENCIONES:
- QUERY_PRODUCTS: Pregunta sobre productos disponibles (ej: "¿qué camisas tienen?")
- CREATE_CART: Quiere comprar/agregar productos (ej: "quiero 2 camisas azules", "comprar pantalones")
- MODIFY_CART: Quiere modificar un carrito existente (ej: "elimina el producto 1", "agrega pantalón", "cambia cantidad")
- VIEW_CART: Quiere ver su carrito (ej: "muéstrame mi carrito", "qué tengo en el carrito", "dime los productos")
- GENERAL_QUESTION: Pregunta general sobre la tienda (ej: "¿cómo compro?", "hacen envíos?")
- GREETING: Saludo o conversación casual (ej: "hola", "gracias")

IMPORTANTE:
- Si menciona un número de carrito con # o "carrito", extrae el cart_id
- Si NO menciona número pero hay un CARRITO ACTIVO y la intención es MODIFY_CART o VIEW_CART, usa el cart_id del carrito activo
- Si dice "agregar", "quitar", "eliminar" sin mencionar carrito, asume que se refiere al carrito activo`;

            const intentResponse = await this.generateText(intentPrompt);
            console.log('[GEMINI] Intent analysis:', intentResponse);

            const jsonMatch = intentResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('[GEMINI] Could not parse intent JSON, defaulting to query');
                const fallbackResult = await this.queryProducts(message);
                this.addToHistory(userId, 'assistant', fallbackResult.response);
                return fallbackResult;
            }

            const intent = JSON.parse(jsonMatch[0]);
            console.log('[GEMINI] Detected intent:', intent);

            if (!intent.cart_id && session.activeCartId && (intent.intent === 'MODIFY_CART' || intent.intent === 'VIEW_CART')) {
                intent.cart_id = session.activeCartId;
                console.log('[GEMINI] Using active cart ID:', session.activeCartId);
            }

            let result: any;

            switch (intent.intent) {
                case 'CREATE_CART':
                    const purchaseResult = await this.processPurchaseIntent(message, 1);
                    if (purchaseResult.cart) {
                        session.activeCartId = purchaseResult.cart.id;
                        console.log('[GEMINI] Set active cart to:', session.activeCartId);
                    }
                    result = {
                        response: purchaseResult.response,
                        cart: purchaseResult.cart,
                    };
                    break;

                case 'MODIFY_CART':
                    if (!intent.cart_id) {
                        result = {
                            response: 'Para modificar tu carrito, necesito el número de carrito. Por favor menciona el carrito con #número (ej: carrito #8)',
                        };
                    } else {
                        const editResult = await this.editCart(intent.cart_id, message);
                        result = {
                            response: editResult.response,
                            cart: editResult.cart,
                        };
                    }
                    break;

                case 'VIEW_CART':
                    if (!intent.cart_id) {
                        result = {
                            response: 'Para ver tu carrito, necesito el número. Por favor menciona el carrito con #número (ej: carrito #8)',
                        };
                    } else {
                        const cartDetail = await this.cartsService.getCartDetail(intent.cart_id);
                        session.activeCartId = cartDetail.id; // Update active cart
                        const cartMessage = `
🛒 **Carrito #${cartDetail.id}**

${cartDetail.items.length === 0 ? 'Tu carrito está vacío.' : '**Productos:**'}
${cartDetail.items.map((item) => `- ${item.product.tipo_prenda} (${item.product.color}, Talla: ${item.product.talla}) x${item.qty} - $${item.subtotal.toFixed(2)}`).join('\n')}

**Total: $${cartDetail.total.toFixed(2)}**
**Cantidad de items: ${cartDetail.itemCount}**

¿Deseas modificar algo?`;
                        result = {
                            response: cartMessage,
                            cart: cartDetail,
                        };
                    }
                    break;

                case 'QUERY_PRODUCTS':
                    const queryResult = await this.queryProducts(message);
                    result = {
                        response: queryResult.response,
                        products: queryResult.products,
                    };
                    break;

                case 'GENERAL_QUESTION':
                case 'GREETING':
                default:
                    const generalResult = await this.queryProducts(message);
                    result = {
                        response: generalResult.response,
                        products: generalResult.products,
                    };
                    break;
            }

            this.addToHistory(userId, 'assistant', result.response);

            return result;
        } catch (error: any) {
            console.error('[GEMINI] Error processing user message:', error);
            const errorResponse = 'Ocurrió un error al procesar tu mensaje. ¿Podrías intentar de nuevo?';
            this.addToHistory(userId, 'assistant', errorResponse);
            return {
                response: errorResponse,
            };
        }
    }
}
