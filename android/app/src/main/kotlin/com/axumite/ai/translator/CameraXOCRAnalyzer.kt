package com.axumite.ai.translator

import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

/**
 * CameraX ImageAnalysis pipeline feeding Google ML Kit Text Recognition.
 * Respects frame-by-frame backpressure and always closes ImageProxy cleanly.
 */
class CameraXOCRAnalyzer(
    private val onTextBlocksDetected: (fullText: String, blocks: List<DetectedTextRegion>) -> Unit,
    private val onFailure: (Exception) -> Unit
) : ImageAnalysis.Analyzer {

    data class DetectedTextRegion(
        val text: String,
        val left: Int,
        val top: Int,
        val right: Int,
        val bottom: Int
    )

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            return
        }

        val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        recognizer.process(inputImage)
            .addOnSuccessListener { visionText ->
                val regions = visionText.textBlocks.mapNotNull { block ->
                    val box = block.boundingBox ?: return@mapNotNull null
                    DetectedTextRegion(
                        text = block.text,
                        left = box.left,
                        top = box.top,
                        right = box.right,
                        bottom = box.bottom
                    )
                }
                if (visionText.text.isNotBlank()) {
                    onTextBlocksDetected(visionText.text, regions)
                }
            }
            .addOnFailureListener { exc ->
                onFailure(exc)
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }
}
