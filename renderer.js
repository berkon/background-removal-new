//import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
import vision from "./node_modules/@mediapipe/tasks-vision/vision_bundle.js";
const { ImageSegmenter, SegmentationMask, FilesetResolver } = vision;

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;

//FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm").then(async (vision) => {

(async () => {
	let vision = {
		wasmBinaryPath: "./node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm",
		wasmLoaderPath: "./node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js"
	}

   	//const imageSegmenter = await ImageSegmenter.createFromModelPath(vision, "https://storage.googleapis.com/mediapipe-tasks/image_segmenter/selfie_segmentation.tflite");
	const imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
    	baseOptions: {
			modelAssetPath:
        	//	"https://storage.googleapis.com/mediapipe-assets/selfie_segm_128_128_3.tflite?generation=1678818071447437"
        	//	"https://storage.googleapis.com/mediapipe-assets/selfie_segm_144_256_3.tflite?generation=1678818074421716"
        	//"https://storage.googleapis.com/mediapipe-tasks/image_segmenter/selfie_segmentation.tflite"
			"./selfie_segmentation.tflite"
		},
		runningMode: "VIDEO",
		outputCategoryMask: true,
		outputConfidenceMasks: true
    });

	const video = document.getElementById("webcam");
    const canvasElement = document.createElement("canvas");
    canvasElement.width = VIDEO_WIDTH;
    canvasElement.height = VIDEO_HEIGHT;
    document.body.appendChild(canvasElement);
    const canvasCtx = canvasElement.getContext("2d");
    const bkgCanvasElement = document.createElement("canvas");
    bkgCanvasElement.width = VIDEO_WIDTH;
    bkgCanvasElement.height = VIDEO_HEIGHT;
    const bkgCanvasCtx = bkgCanvasElement.getContext("2d");
    const numOfPixels = VIDEO_WIDTH * VIDEO_HEIGHT;
    const maskClampedArray = new Uint8ClampedArray(4 * numOfPixels);

    async function frameCallback(result) {
    	for (let i = 0; i < numOfPixels; i++) {
		//	maskClampedArray[(i * 4)] = (result.categoryMask as Uint8ClampedArray)[i] * 255;
		//	maskClampedArray[(i * 4)+1] = (result.categoryMask as Uint8ClampedArray)[i] * 255;
		//	maskClampedArray[(i * 4)+2] = (result.categoryMask as Uint8ClampedArray)[i] * 255;
			maskClampedArray[i * 4 + 3] = 255 - result.categoryMask.containers[0][i];
		}

		bkgCanvasCtx.globalCompositeOperation = "copy";
		bkgCanvasCtx.drawImage ( video, 0, 0, canvasElement.width, canvasElement.height );
		const maskImageData = new ImageData( maskClampedArray, VIDEO_WIDTH, VIDEO_HEIGHT );
		const maskImageBitmap = await createImageBitmap(maskImageData);

		// Draw mask shape onto the background canvas and blur that canvas
		bkgCanvasCtx.globalCompositeOperation = "destination-out"; // keep only part where not overlapping with mask
		bkgCanvasCtx.drawImage ( maskImageBitmap, 0, 0, canvasElement.width, canvasElement.height );
		bkgCanvasCtx.filter = "blur(10px)";

		// Draw the content from the hidden (blurred) canvas onto the output canvas.
		canvasCtx.globalCompositeOperation = "copy";
		canvasCtx.drawImage ( bkgCanvasElement, 0, 0 );

		// Draw the original video frame onto the output canvas.
		canvasCtx.globalCompositeOperation = "destination-atop"; // draw behind and shine through
		canvasCtx.drawImage ( video, 0, 0, canvasElement.width, canvasElement.height );

		window.requestAnimationFrame(triggerSegmentation);
    }

    async function triggerSegmentation() {
		const startTimeMs = performance.now();
		imageSegmenter.segmentForVideo(video, startTimeMs, frameCallback);
    }

    setTimeout(async () => {
    	video.srcObject = await navigator.mediaDevices.getUserMedia({
        	video: {
          		width: VIDEO_WIDTH,
          		height: VIDEO_HEIGHT,
        	}
      	});
      	video.addEventListener("loadeddata", triggerSegmentation);
    }, 100);
})()
