import { Product } from '../src/entities/product.entity';

function testVolumePricingLogic() {
    console.log('🧪 Testing Volume-Based Pricing Logic\n');

    const mockProduct = new Product();
    mockProduct.id = 1;
    mockProduct.tipo_prenda = 'Camisa';
    mockProduct.talla = 'M';
    mockProduct.color = 'Azul';
    mockProduct.precio_50_u = 10.00;
    mockProduct.precio_100_u = 8.50;
    mockProduct.precio_200_u = 7.00;
    mockProduct.cantidad_disponible = 1000;
    mockProduct.disponible = true;
    mockProduct.categoria = 'Ropa';
    mockProduct.descripcion = 'Test product';

    console.log('📦 Mock Product:');
    console.log(`   ${mockProduct.tipo_prenda} ${mockProduct.color} ${mockProduct.talla}`);
    console.log(`   Price tiers:`);
    console.log(`   - 1-99 units: $${mockProduct.precio_50_u}`);
    console.log(`   - 100-199 units: $${mockProduct.precio_100_u}`);
    console.log(`   - 200+ units: $${mockProduct.precio_200_u}`);
    console.log('');

    const testCases = [
        { qty: 1, expected: 10.00, tier: '1-99' },
        { qty: 50, expected: 10.00, tier: '1-99' },
        { qty: 99, expected: 10.00, tier: '1-99' },
        { qty: 100, expected: 8.50, tier: '100-199' },
        { qty: 150, expected: 8.50, tier: '100-199' },
        { qty: 199, expected: 8.50, tier: '100-199' },
        { qty: 200, expected: 7.00, tier: '200+' },
        { qty: 500, expected: 7.00, tier: '200+' },
        { qty: 1000, expected: 7.00, tier: '200+' },
    ];

    console.log('🧪 Test Results:');
    console.log('─'.repeat(70));
    console.log('Qty\tExpected\tActual\t\tTier\t\tStatus');
    console.log('─'.repeat(70));

    let allPassed = true;
    for (const testCase of testCases) {
        const result = mockProduct.getPriceForQuantity(testCase.qty);
        const passed = result === testCase.expected;
        const icon = passed ? '✅' : '❌';

        console.log(
            `${testCase.qty}\t$${testCase.expected.toFixed(2)}\t\t$${result.toFixed(2)}\t\t${testCase.tier}\t\t${icon}`
        );

        if (!passed) {
            allPassed = false;
            console.log(`   ⚠️  FAILED: Expected $${testCase.expected} but got $${result}`);
        }
    }

    console.log('─'.repeat(70));
    console.log('');

    console.log('💰 Cart Calculation Examples:');
    console.log('─'.repeat(70));

    const cartExamples = [
        { qty: 50, description: 'Small order' },
        { qty: 150, description: 'Medium order' },
        { qty: 300, description: 'Large order' },
    ];

    for (const example of cartExamples) {
        const price = mockProduct.getPriceForQuantity(example.qty);
        const total = price * example.qty;
        console.log(`${example.description} (${example.qty} units):`);
        console.log(`  Unit price: $${price.toFixed(2)}`);
        console.log(`  Total: $${total.toFixed(2)}`);
        console.log('');
    }

    console.log('─'.repeat(70));
    console.log(allPassed ? '\n✅ All tests PASSED!' : '\n❌ Some tests FAILED!');
    console.log('');

    return allPassed;
}

const success = testVolumePricingLogic();
process.exit(success ? 0 : 1);
