import vision from "./node_modules/@mediapipe/tasks-vision/vision_bundle.js";
const { ImageSegmenter } = vision;

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;

(async () => {
	let vision = {
		wasmBinaryPath: "./node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm",
		wasmLoaderPath: "./node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js"
	}

	const imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
    	baseOptions: { modelAssetPath:	"./selfie_segmentation.tflite" },
		runningMode: "VIDEO",
		outputCategoryMask: true,
		outputConfidenceMasks: true
    });

	const video = document.getElementById("webcam");

    const canvasElement = document.createElement("canvas");
    canvasElement.width = VIDEO_WIDTH;
    canvasElement.height = VIDEO_HEIGHT;
    document.body.appendChild(canvasElement);
	const canvasCtx = canvasElement.getContext("bitmaprenderer");

	const offscreenBkgCanvas = new OffscreenCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
    const offscreenBkgCanvasCtx = offscreenBkgCanvas.getContext("2d");

	const offscreenCanvas = new OffscreenCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
	const offscreenCanvasCtx = offscreenCanvas.getContext("2d");

	const numOfPixels = VIDEO_WIDTH * VIDEO_HEIGHT;
    const maskClampedArray = new Uint8ClampedArray(4 * numOfPixels);

    async function frameCallback(result) {
    	for (let i = 0; i < numOfPixels; i++) {
		//	maskClampedArray[(i * 4)] = (result.categoryMask as Uint8ClampedArray)[i] * 255;
		//	maskClampedArray[(i * 4)+1] = (result.categoryMask as Uint8ClampedArray)[i] * 255;
		//	maskClampedArray[(i * 4)+2] = (result.categoryMask as Uint8ClampedArray)[i] * 255;
			maskClampedArray[i * 4 + 3] = 255 - result.categoryMask.containers[0][i];
		}

		offscreenBkgCanvasCtx.globalCompositeOperation = "copy";
		offscreenBkgCanvasCtx.drawImage ( video, 0, 0, canvasElement.width, canvasElement.height );
		const maskImageData = new ImageData( maskClampedArray, VIDEO_WIDTH, VIDEO_HEIGHT );
		const maskImageBitmap = await createImageBitmap(maskImageData);

		// Draw mask shape onto the background canvas and blur that canvas
		offscreenBkgCanvasCtx.globalCompositeOperation = "destination-out"; // keep only part where not overlapping with mask
		offscreenBkgCanvasCtx.drawImage ( maskImageBitmap, 0, 0, canvasElement.width, canvasElement.height );
		offscreenBkgCanvasCtx.filter = "blur(10px)";

		// Draw the content from the hidden (blurred) canvas onto the output canvas.
		offscreenCanvasCtx.globalCompositeOperation = "copy";
		offscreenCanvasCtx.drawImage ( offscreenBkgCanvas, 0, 0 );

		// Draw the original video frame onto the output canvas.
		offscreenCanvasCtx.globalCompositeOperation = "destination-atop"; // draw behind and shine through
		offscreenCanvasCtx.drawImage ( video, 0, 0, canvasElement.width, canvasElement.height );

		canvasCtx.transferFromImageBitmap(offscreenCanvas.transferToImageBitmap());

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
