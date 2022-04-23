import { useRef, useEffect } from "react";
import Webcam from "react-webcam";

import { Pose, POSE_LANDMARKS, POSE_CONNECTIONS } from "@mediapipe/pose";
import {
  drawConnectors,
  drawLandmarks,
} from "@mediapipe/drawing_utils/drawing_utils";
import { Camera } from "@mediapipe/camera_utils/camera_utils";
import { classifyPose } from "./utils";

import * as Tone from "tone";
import { NoteSetter } from "./NoteSetter";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const prevKeyRef = useRef(null);
  const toneRef = useRef(new Tone.Synth().toDestination());
  const toneNowRef = useRef(null);
  const toneListRef = useRef([0, "E5", "Eb5", "B4", "D5", "C5", "A4"]);

  useEffect(() => {
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

  const onResults = (results) => {
    // // Update the frame rate.
    // fpsControl.tick();

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");
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
    if (totalScore > 0) {
      key = toneListRef.current[totalScore];
    }

    console.log(key, prevKeyRef.current);
    // switch note

    // stop playing (double no dab)
    if (key !== prevKeyRef.current) {
      if (key && key.length > 0) {
        toneRef.current?.triggerRelease();
        toneRef.current.triggerAttack(key, Tone.now() + 0.05);
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
        Allow Audio
      </button>
      <span>CLASSIFICATION STATUS!!!1</span>
      <br />
      <Webcam
        audio={false}
        mirrored={true}
        ref={webcamRef}
        style={{
          visibility: "hidden",
          width: "1px",
          height: "1px",
        }}
      />
      <div style={{display: 'flex', flexDirection: 'row',margin: 'auto'}}>
        <span>
          <NoteSetter noteIndex="1" ref={toneListRef} />
          <NoteSetter noteIndex="2" ref={toneListRef} />
          <NoteSetter noteIndex="3" ref={toneListRef} />
        </span>
        <canvas
          ref={canvasRef}
          style={{
            textAlign: "center",
            zindex: 9,
            width: 640,
            height: 480,
          }}
        />

        <span>
          <NoteSetter noteIndex="4" ref={toneListRef} />
          <NoteSetter noteIndex="5" ref={toneListRef} />
          <NoteSetter noteIndex="6" ref={toneListRef} />
        </span>
      </div>
    </div>
  );
}

export default App;
