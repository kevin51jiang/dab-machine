import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

import { Pose, POSE_LANDMARKS, POSE_CONNECTIONS } from "@mediapipe/pose";
import {
  drawConnectors,
  drawLandmarks,
  lerp,
} from "@mediapipe/drawing_utils/drawing_utils";
import { Camera } from "@mediapipe/camera_utils/camera_utils";
import { classifyPose } from "./utils";

import * as Tone from "tone";

function App() {
  const webcamRef = useRef(null);
  const playerRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const prevKeyRef = useRef(null);
  const toneRef = useRef(new Tone.Synth().toDestination());
  const toneNowRef = useRef(null);

  const [isClassifying, setIsClassifying] = useState(true);

  useEffect(() => {
    const pose = createNewPose();
    poseRef.current = pose;

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

    return pose;
  };

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
      return;
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

    const pose = classifyPose(results.poseLandmarks);
    console.log("Classification: ", pose);

    const horizontalScore = pose.includes("left") ? 3 : 0;
    const verticalScore = pose.includes("Up")
      ? 1
      : pose.includes("Side")
      ? 2
      : pose.includes("Down")
      ? 3
      : 0;
    const totalScore = horizontalScore + verticalScore;

    let key = "";
    switch (totalScore) {
      case 1:
        key = "C4";
        break;
      case 2:
        key = "D4";
        break;
      case 3:
        key = "E4";
        break;
      case 4:
        key = "F4";
        break;
      case 5:
        key = "G4";
        break;
      case 6:
        key = "A4";
        break;
      default:
        key = "";
        break;
    }

    console.log(key, prevKeyRef.current);
    // switch note

    // stop playing (double no dab)
    if (key !== prevKeyRef.current) {
      if (key && key.length > 0) {
        toneRef.current?.triggerRelease();
        toneRef.current.triggerAttack(key, Tone.now());
      }
    }

    // double frame of nothing recognized
    if (key === "" && prevKeyRef.current === "") {
      toneRef.current?.triggerRelease();
    }

    prevKeyRef.current = key;
  };

  return (
    <div>
      <button
        onClick={async () => {
          await Tone.start();
          console.log("audio is ready");
          toneNowRef.current = Tone.now();
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
          width: 640,
          height: 480,
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
          width: 640,
          height: 480,
        }}
      ></canvas>
    </div>
  );
}

export default App;
