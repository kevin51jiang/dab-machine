import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

import { Pose, POSE_LANDMARKS, POSE_CONNECTIONS } from "@mediapipe/pose";
import {
  drawConnectors,
  drawLandmarks,
  lerp
} from "@mediapipe/drawing_utils/drawing_utils";
import { Camera } from "@mediapipe/camera_utils/camera_utils";
import { classifyPose } from "./utils";

function App() {
  const webcamRef = useRef(null);

  const canvasRef = useRef(null);
  const poseRef = useRef(null);

  const [isClassifying, setIsClassifying] = useState(true);

  useEffect(() => {
    const pose = createNewPose()
    poseRef.current = pose

    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null
    ) {
      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          await pose.send({ image: webcamRef.current.video });
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }
  }, []);

  const createNewPose = () => {
    const pose = new Pose({
      locateFile: (file) => {
        console.log(`${file}`);
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.4.1633558788/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onResults);

    return pose
  }

  const onResults = (results) => {
    // // Hide the spinner.
    // document.body.classList.add("loaded");

    // // Update the frame rate.
    // fpsControl.tick();

    if (!isClassifying) {
      return;
    }

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");
    // removeLandmarks(results);
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
    canvasCtx.translate(videoWidth, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );
    canvasCtx.lineWidth = 5;

    if (!results.poseLandmarks) {
      return
    }

    // Pose...
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "white",
    });
    drawLandmarks(
      canvasCtx,
      Object.values(POSE_LANDMARKS).map(
        (index) => results.poseLandmarks[index]
      ),
      { visibilityMin: 0.65, color: "white", fillColor: "rgb(255,138,0)" }
    );

    classifyPose(results.poseLandmarks)
    // console.log("Classification: ", classifyPose(results.poseLandmarks))
  };

  return (
    <div>
      <button
        onClick={() => {
          if (isClassifying) {
            console.log("CLOSING");
            poseRef.current.close();
          } else {
            console.log("re initializing");
            // poseRef.current.onResults(onResults);
            poseRef.current = createNewPose()
          }
        }}
      >
        Is classifying? {isClassifying}
      </button>
      <span>CLASSIFICATION STATUS!!!1</span>
      <br />
      <Webcam
        audio={false}
        mirrored={true}
        ref={webcamRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: "0",
          right: "0",
          textAlign: "center",
          zindex: 9,
          width: 1280,
          height: 720,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: "0",
          right: "0",
          textAlign: "center",
          zindex: 9,
          width: 1280,
          height: 720,
        }}
      ></canvas>
    </div>
  );
}

export default App;
