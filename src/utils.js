import { POSE_LANDMARKS } from "@mediapipe/pose";

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

const radToDeg = (r) => (r * 180) / Math.PI;

const angleBetween2DCoords = (coord1, coord2, coord3) => {
  const vec1 = [coord2.x - coord1.x, coord2.y - coord1.y];
  const vec2 = [coord3.x - coord2.x, coord3.y - coord2.y];

  return angleBetween2DVectors(vec1, vec2);
};

const angleBetween2DVectors = (vec1, vec2) => {
  const dot = vec1[0] * vec2[0] + vec1[1] * vec2[1];
  const magnitudes =
    Math.sqrt(Math.pow(vec1[0], 2) + Math.pow(vec1[1], 2)) *
    Math.sqrt(Math.pow(vec2[0], 2) + Math.pow(vec2[1], 2));

  return radToDeg(Math.acos(dot / magnitudes));
};

export const DAB_TYPES = {
  leftUpDab: "leftUpDab",
  leftSideDab: "leftSideDab",
  leftDownDab: "leftDownDab",
  rightUpDab: "rightUpDab",
  rightSideDab: "rightSideDab",
  rightDownDab: "rightDownDab",
  notDab: "notDab",
};

const isChickenWing = (wrist, elbow, shoulder) => {
  // use the wrist to elbow as the direction vector
  const wristElbow = [wrist.x - elbow.x, wrist.y - elbow.y];
  const shoulderElbow = [shoulder.x - elbow.x, shoulder.y - elbow.y];

  const angle = angleBetween2DVectors(wristElbow, shoulderElbow);

  // cutoff for not being a chicken wing
  if (angle > 30 || wristElbow[0] === 0) {
    return false;
  }

  // now, determine the direction.
  // this is solely based on forearm (wristElbow)
  // we test the slope, aka simply the rise over run.
//   const slopeDegrees = radToDeg(Math.atan2(-wristElbow[1], wristElbow[0]));
  const slopeDegrees = radToDeg(Math.atan(wristElbow[1] / wristElbow[0]));
  if (Math.abs(slopeDegrees) <= 25) {
    return 0;
  } else if (slopeDegrees > 25) {
    return 1;
  } else {
    return -1;
  }
};

const isStraightArm = (wrist, elbow, shoulder) => {
  // all 3 should have the same "direction vector",
  const wristElbow = [wrist.x - elbow.x, wrist.y - elbow.y];
  const shoulderElbow = [shoulder.x - elbow.x, shoulder.y - elbow.y];

  const angle = angleBetween2DVectors(wristElbow, shoulderElbow);


  if (angle < 165 || angle > 195) {
    return false;
  }

  //go for shoulder to wrist b/c elbow can be weird, and we already checked for elbow being too weird
  const slopeRaw = (wrist.y - shoulder.y) / (wrist.x - shoulder.x);
  const slopeDegrees = radToDeg(Math.atan(slopeRaw));
  if (Math.abs(slopeDegrees) <= 20) {
    return 0;
  } else if (slopeDegrees > 20) {
    return 1;
  } else {
    return -1;
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

  if (rightElbowAngle < 65 && leftElbowAngle > 165) {
    // rightDab
    // if it's right dab, that means right arm is the chicken wing, left arm is striaght.
    const rightArmDir = isChickenWing(
      results[POSE_LANDMARKS.RIGHT_WRIST],
      results[POSE_LANDMARKS.RIGHT_ELBOW],
      results[POSE_LANDMARKS.RIGHT_SHOULDER]
    );
    const leftArmDir = isStraightArm(
      results[POSE_LANDMARKS.LEFT_WRIST],
      results[POSE_LANDMARKS.LEFT_ELBOW],
      results[POSE_LANDMARKS.LEFT_SHOULDER]
    );

    // console.log('right', leftArmDir, rightArmDir)
    if (typeof rightArmDir === 'boolean'|| typeof leftArmDir === 'boolean' || !(rightArmDir === leftArmDir)) {
      return DAB_TYPES.notDab;
    }


    const armDir = rightArmDir
    if (armDir === 1) {
        return DAB_TYPES.rightDownDab
    } else if (armDir === 0) {
        return DAB_TYPES.rightSideDab
    } else {
        return DAB_TYPES.rightUpDab
    }
  } else if (leftElbowAngle < 65 && rightElbowAngle > 165) {
    // leftDab
    // if it's left dab, that means left arm is the chicken wing, right arm is striaght.
    const rightArmDir = isStraightArm(
      results[POSE_LANDMARKS.RIGHT_WRIST],
      results[POSE_LANDMARKS.RIGHT_ELBOW],
      results[POSE_LANDMARKS.RIGHT_SHOULDER]
    );
    const leftArmDir = isChickenWing(
      results[POSE_LANDMARKS.LEFT_WRIST],
      results[POSE_LANDMARKS.LEFT_ELBOW],
      results[POSE_LANDMARKS.LEFT_SHOULDER]
    );

    // console.log('left', leftArmDir, rightArmDir)
    if (typeof rightArmDir === 'boolean'|| typeof leftArmDir === 'boolean' || !(rightArmDir === leftArmDir)) {
      return DAB_TYPES.notDab;
    }


    const armDir = rightArmDir
    if (armDir === 1) {
        return DAB_TYPES.leftUpDab
    } else if (armDir === 0) {
        return DAB_TYPES.leftSideDab
    } else {
        return DAB_TYPES.leftDownDab
    }


  }

  return DAB_TYPES.notDab;
};
