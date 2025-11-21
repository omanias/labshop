
import { GeminiService } from '../src/gemini/gemini.service';
import { CartsService } from '../src/carts/carts.service';
import { ProductsService } from '../src/products/products.service';

const createMock = () => {
    const fn: any = (...args: any[]) => {
        fn.calls.push(args);
        return fn.returnValue;
    };
    fn.calls = [] as any[][];
    fn.mockResolvedValue = (val: any) => { fn.returnValue = Promise.resolve(val); };
    fn.mockClear = () => { fn.calls = []; };
    return fn;
};

const mockProductsService = {
    findAll: createMock(),
} as any as ProductsService;

const mockCartsService = {
    getCartDetail: createMock(),
    updateCart: createMock(),
} as any as CartsService;

class TestGeminiService extends GeminiService {
    constructor() {
        super(mockProductsService, mockCartsService);
    }

    async generateText(prompt: string): Promise<string> {
        console.log('\n[MOCK GEMINI] Received prompt length:', prompt.length);

        if (prompt.includes('quiero eliminar la camiseta roja')) {
            return JSON.stringify({
                action: 'UPDATE',
                updates: [{ product_id: 1, qty: 0 }],
                reasoning: 'User wants to remove product 1'
            });
        }

        if (prompt.includes('cambiar la cantidad a 5')) {
            return JSON.stringify({
                action: 'UPDATE',
                updates: [{ product_id: 1, qty: 5 }],
                reasoning: 'User wants to update product 1 to 5 units'
            });
        }

        if (prompt.includes('no entiendo nada')) {
            return JSON.stringify({
                action: 'NONE',
                updates: [],
                reasoning: 'Ambiguous request'
            });
        }

        return 'Invalid JSON response';
    }
}

async function runTests() {
    const geminiService = new TestGeminiService();

    const mockCart = {
        id: 1,
        items: [
            {
                productId: 1,
                qty: 2,
                product: {
                    id: 1,
                    tipo_prenda: 'Camiseta',
                    color: 'Rojo',
                    talla: 'M',
                    precio_50_u: 10,
                },
                subtotal: 20
            }
        ],
        total: 20
    };

    (mockCartsService.getCartDetail as any).mockResolvedValue(mockCart);
    (mockCartsService.updateCart as any).mockResolvedValue({ id: 1 });

    console.log('--- TEST 1: Remove Item ---');
    const res1 = await geminiService.editCart(1, 'quiero eliminar la camiseta roja');
    console.log('Response:', res1.response);
    console.log('Cart updated?', (mockCartsService.updateCart as any).calls.length > 0);

    (mockCartsService.updateCart as any).mockClear();

    console.log('\n--- TEST 2: Update Quantity ---');
    const res2 = await geminiService.editCart(1, 'cambiar la cantidad a 5');
    console.log('Response:', res2.response);

    (mockCartsService.updateCart as any).mockClear();

    console.log('\n--- TEST 3: Ambiguous ---');
    const res3 = await geminiService.editCart(1, 'no entiendo nada');
    console.log('Response:', res3.response);
}

runTests().catch(console.error);
