const ImagePreviewService = require('./src/services/preview/image.service');
const sharp = require('sharp');

async function testImagePreview() {
  try {
    console.log('🧪 Testing image preview generation...\n');
    
    // Create proper PNG test image using sharp's creation methods
    const buffer = await sharp({
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 100, b: 100 }
    }).png().toBuffer();
    
    console.log(`✅ Test image created (${buffer.length} bytes)`);
    
    // Generate previews
    const result = await ImagePreviewService.generate(buffer);
    
    console.log('\n🎉 Preview generation successful!');
    console.log(`Original size: ${result.originalDimensions.width}x${result.originalDimensions.height}`);
    console.log(`Processing time: ${result.processingTime}ms\n`);
    
    for (const [name, preview] of Object.entries(result.previews)) {
      console.log(`  ✓ ${name}: ${preview.dimensions.width}x${preview.dimensions.height}, ${preview.fileSize} bytes`);
    }
    
    console.log('\n✅ ALL TESTS PASSED!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testImagePreview();
