import { POSE_LANDMARKS, POSE_CONNECTIONS } from "@mediapipe/pose";

/**
 * Calculate angle between 3 points in 3D space.
 * Note: assumes we want 1 vector to run from coord1 -> coord2, and the other
 * from coord3 -> coord2.
 *
 * Stolen from: https://gist.github.com/andfaulkner/c4ad12a72d29bcd653eb4b8cca2ae476
 *
 *
 * @param {x: number; y: number; z: number} coord1 1st (3D) coordinate
 * @param {x: number; y: number; z: number} coord2 2nd (3D) coordinate
 * @param {x: number; y: number; z: number} coord3 3rd (3D) coordinate
 *
 * @return {number} Angle between the 3 points
 */
const angleBetween3DCoords = (coord1, coord2, coord3) => {
  // Calculate vector between points 1 and 2
  const v1 = {
    x: coord1.x - coord2.x,
    y: coord1.y - coord2.y,
    z: coord1.z - coord2.z,
  };

  // Calculate vector between points 2 and 3
  const v2 = {
    x: coord3.x - coord2.x,
    y: coord3.y - coord2.y,
    z: coord3.z - coord2.z,
  };

  v1.z = 0;
  v2.z = 0;

  // The dot product of vectors v1 & v2 is a function of the cosine of the
  // angle between them (it's scaled by the product of their magnitudes).

  // Normalize v1
  const v1mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const v1norm = {
    x: v1.x / v1mag,
    y: v1.y / v1mag,
    z: v1.z / v1mag,
  };

  // Normalize v2
  const v2mag = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  const v2norm = {
    x: v2.x / v2mag,
    y: v2.y / v2mag,
    z: v2.z / v2mag,
  };

  // Calculate the dot products of vectors v1 and v2
  const dotProducts =
    v1norm.x * v2norm.x + v1norm.y * v2norm.y + v1norm.z * v2norm.z;

  // Extract the angle from the dot products
  const angle = (Math.acos(dotProducts) * 180.0) / Math.PI;

  // Round result to 3 decimal points and return
  return Math.round(angle * 10) / 10;
};

const verticalAngleOfVector = (coord1, coord2) => {
  if (!coord1 || !coord2) {
    console.log(
      "a vector doesn't exist to calc vertical angle from",
      coord1,
      coord2
    );
    return -1;
  }

  // ASsuming dot vector of x=1, y=0
  const directionVector = [coord2.x - coord1.x, coord2.y - coord1.y];

  const vecMagnitude = Math.sqrt(
    Math.pow(directionVector[0], 2) + Math.pow(directionVector[1], 2)
  );

  let angle = Math.acos(directionVector[0] / vecMagnitude) * (180 / Math.PI);
  angle = Math.round(angle * 10) / 10;

  return angle;
};

const DAB_DIRECTIONS = {
  rightDab: "rightDab",
  leftDab: "leftDab",
};

const DAB_TYPES = {
  leftUpDab: "leftUpDab",
  leftSideDab: "leftSideDab",
  leftDownDab: "leftDownDab",
  rightUpDab: "rightUpDab",
  rightSideDab: "rightSideDab",
  rightDownDab: "rightDownDab",
  notDab: "notDab",
};

const getVectorDirection = (coord1, coord2, armName) => {
  const angle = verticalAngleOfVector(coord1, coord2);
  console.log("angle", angle);

  // in the middle region, since angles (from top to bottom), go 90, 180, then 90 again.
  if (angle < 30 || angle > 160) {
    return "side";
  }
  if (armName === "right") {
    if (coord1.y > coord2.y) {
      return "up";
    } else {
      return "down";
    }
  } else {
    // left
    if (coord1.y < coord2.y) {
      return "up";
    } else {
      return "down";
    }
  }
};

// https://google.github.io/mediapipe/images/mobile/pose_tracking_full_body_landmarks.png
export const classifyPose = (results) => {
  const rightElbowAngle = angleBetween3DCoords(
    results[POSE_LANDMARKS.RIGHT_WRIST],
    results[POSE_LANDMARKS.RIGHT_ELBOW],
    results[POSE_LANDMARKS.RIGHT_SHOULDER]
  );

  const leftElbowAngle = angleBetween3DCoords(
    results[POSE_LANDMARKS.LEFT_SHOULDER],
    results[POSE_LANDMARKS.LEFT_ELBOW],
    results[POSE_LANDMARKS.LEFT_WRIST]
  );

  let dabDirection = null;
  if (rightElbowAngle < 65 && leftElbowAngle > 165) {
    dabDirection = DAB_DIRECTIONS.rightDab;
  } else if (leftElbowAngle < 65 && rightElbowAngle > 165) {
    dabDirection = DAB_DIRECTIONS.leftDab;
  } else {
    dabDirection = DAB_TYPES.notDab;
  }

  //   if (dabDirection === DAB_TYPES.notDab) {
  //     return DAB_DIRECTIONS.notDab;
  //   }

  const boneSets = {
    leftForearm: {
      bones: [
        results[POSE_LANDMARKS.LEFT_ELBOW],
        results[POSE_LANDMARKS.LEFT_WRIST],
      ],
    },
    leftUpperarm: {
      bones: [
        results[POSE_LANDMARKS.LEFT_SHOULDER],
        results[POSE_LANDMARKS.LEFT_ELBOW],
      ],
    },
    rightForearm: {
      bones: [
        results[POSE_LANDMARKS.RIGHT_WRIST],
        results[POSE_LANDMARKS.RIGHT_ELBOW],
      ],
    },
    rightUpperarm: {
      bones: [
        results[POSE_LANDMARKS.RIGHT_ELBOW],
        results[POSE_LANDMARKS.RIGHT_SHOULDER],
      ],
    },
  };

  // get the directions of all the bonesets
  for (const [boneSet, bonesVal] of Object.entries(boneSets)) {
    boneSets[boneSet].direction = getVectorDirection(
      bonesVal.bones[0],
      bonesVal.bones[1],
      boneSet.includes("right") ? "right" : "left"
    );
  }

  let dabType = DAB_TYPES.notDab;
  if (dabDirection === DAB_DIRECTIONS.leftDab) {
    if (
      boneSets.leftForearm.direction === "up" &&
      boneSets.leftUpperarm.direction === "down" &&
      boneSets.rightForearm.direction === "up" &&
      boneSets.rightUpperarm.direction === "up"
    ) {
      dabType = DAB_TYPES.leftDownDab;
    } else if (
      boneSets.leftForearm.direction === "side" &&
      boneSets.leftUpperarm.direction === "side" &&
      boneSets.rightForearm.direction === "side" &&
      boneSets.rightUpperarm.direction === "side"
    ) {
      dabType = DAB_TYPES.leftSideDab;
    } else if (
      boneSets.leftForearm.direction === "down" &&
      boneSets.leftUpperarm.direction === "up" &&
      boneSets.rightForearm.direction === "down" &&
      boneSets.rightUpperarm.direction === "down"
    ) {
      dabType = DAB_TYPES.leftUpDab;
    }
  } else if (dabDirection === DAB_DIRECTIONS.rightDab) {
    if (
      boneSets.leftForearm.direction === "up" &&
      boneSets.leftUpperarm.direction === "up" &&
      boneSets.rightForearm.direction === "up" &&
      boneSets.rightUpperarm.direction === "down"
    ) {
      dabType = DAB_TYPES.rightDownDab;
    } else if (
      boneSets.leftForearm.direction === "side" &&
      boneSets.leftUpperarm.direction === "side" &&
      boneSets.rightForearm.direction === "side" &&
      boneSets.rightUpperarm.direction === "side"
    ) {
      dabType = DAB_TYPES.rightSideDab;
    } else if (
      boneSets.leftForearm.direction === "down" &&
      boneSets.leftUpperarm.direction === "down" &&
      boneSets.rightForearm.direction === "down" &&
      boneSets.rightUpperarm.direction === "up"
    ) {
      dabType = DAB_TYPES.rightUpDab;
    }
  }

  console.log(dabDirection, dabType, boneSets);
  return dabType;
};
