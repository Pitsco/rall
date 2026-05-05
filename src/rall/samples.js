export const DEFAULT_CODE = `wall MainWall {
  height 15
  width 10
  angle 8
}

route "Easy" on MainWall {
  color "green"
  grade "V1"
  hold "jug" at (1.5, 2.0, 0.18)
  hold "jug" at (2.2, 4.0, 0.18)
  hold "pinch" at (3.0, 6.0, 0.18)
  hold "sloper" at (3.8, 8.5, 0.18)
}

route "Flow" on MainWall {
  color "blue"
  grade "V3"
  hold "crimp" at (5.8, 2.5, 0.18)
  hold "pinch" at (5.1, 4.6, 0.18)
  hold "crimp" at (6.2, 6.8, 0.18)
  hold "sloper" at (5.6, 9.2, 0.18)
}

route "Power" on MainWall {
  color "red"
  grade "V5"
  hold "jug" at (8.0, 2.2, 0.18)
  hold "crimp" at (7.3, 4.3, 0.18)
  hold "pinch" at (8.4, 6.4, 0.18)
  hold "crimp" at (7.8, 9.0, 0.18)
}`;
