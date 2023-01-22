'use strict'

let gl // The webgl context.
let surface // A surface model
let shProgram // A shader program
let spaceball // A SimpleRotator object that lets the user rotate the view by mouse.

function deg2rad(angle) {
  return (angle * Math.PI) / 180
}

// Constructor
function Model(name) {
  this.name = name
  this.iVertexBuffer = gl.createBuffer()
  this.iNormalBuffer = gl.createBuffer()
  this.count = 0

  this.BufferData = function ({ vertexList, normalList }) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexList), gl.STREAM_DRAW)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalList), gl.STREAM_DRAW)

    this.count = vertexList.length / 3
  }

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer)
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(shProgram.iAttribVertex)

    gl.drawArrays(gl.LINE_STRIP, 0, this.count)
  }
}

// Constructor
function ShaderProgram(name, program) {
  this.name = name
  this.prog = program

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1

  this.Use = function () {
    gl.useProgram(this.prog)
  }
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  /* Set the values of the projection transformation */
  let projection = m4.perspective(Math.PI / 8, 1, 8, 12)

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix()

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7)
  let translateToPointZero = m4.translation(0, 0, -10)

  let matAccum0 = m4.multiply(rotateToPointZero, modelView)
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0)

  /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1)

  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  )

  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1])

  surface.Draw()
}

function CreateSurfaceData() {
  let vertexList = []
  let normalList = []
  let deltaV0 = 0.003
  let deltaPhi = 0.003
  let R = 2
  let n = 7
  let a = 3
  let zoom = 3
  let step = 0.01
  for (let v0 = 0; v0 <= Math.PI; v0 += step) {
    for (let phi = 0; phi <= 2 * Math.PI; phi += step) {
      let x = calcX(v0, phi, a, R, n)
      let y = calcY(v0, phi, a, R, n)
      let z = calcZ(v0, R)
      vertexList.push(x / zoom, y / zoom, z / zoom)

      x = calcX(v0 + step, phi, a, R, n)
      y = calcY(v0 + step, phi, a, R, n)
      z = calcZ(v0 + step, R)
      vertexList.push(x / zoom, y / zoom, z / zoom)

      let normal = m4.cross(
        calcDerV0(v0, phi, deltaV0, a, R, n),
        calcDerPhi(v0, phi, deltaPhi, a, R, n)
      )
      normalList.push(normal[0] / zoom, normal[1] / zoom, normal[2] / zoom)

      normal = m4.cross(
        calcDerV0(v0 + step, phi, deltaV0, a, R, n),
        calcDerPhi(v0 + step, phi, deltaPhi, a, R, n)
      )
      normalList.push(normal[0] / zoom, normal[1] / zoom, normal[2] / zoom)
    }
  }
  return { vertexList, normalList }
}

function calcX(v0, phi, a, R, n) {
  return (
    (R * Math.cos(v0) + a * (1 - Math.sin(v0)) * Math.cos(n * phi)) *
    Math.cos(phi)
  )
}

function calcY(v0, phi, a, R, n) {
  return (
    (R * Math.cos(v0) + a * (1 - Math.sin(v0)) * Math.cos(n * phi)) *
    Math.sin(phi)
  )
}

function calcZ(v0, R) {
  return R * Math.sin(v0)
}

const calcDerV0 = (v0, phi, deltaV0, a, R, n) => [
  (calcX(v0 + deltaV0, phi, a, R, n) - calcX(v0, phi, a, R, n)) / deltaV0,
  (calcY(v0 + deltaV0, phi, a, R, n) - calcY(v0, phi, a, R, n)) / deltaV0,
  (calcZ(v0 + deltaV0, R) - calcZ(v0, R)) / deltaV0,
]

const calcDerPhi = (v0, phi, deltaPhi, a, R, n) => [
  (calcX(v0, phi + deltaPhi, a, R, n) - calcX(v0, phi, a, R, n)) / deltaPhi,
  (calcY(v0, phi + deltaPhi, a, R, n) - calcY(v0, phi, a, R, n)) / deltaPhi,
  (calcZ(v0, R) - calcZ(v0, R)) / deltaPhi,
]

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource)

  shProgram = new ShaderProgram('Basic', prog)
  shProgram.Use()

  shProgram.iAttribVertex = gl.getAttribLocation(prog, 'vertex')
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    'ModelViewProjectionMatrix'
  )
  shProgram.iColor = gl.getUniformLocation(prog, 'color')

  surface = new Model('Surface')
  surface.BufferData(CreateSurfaceData())

  gl.enable(gl.DEPTH_TEST)
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vsh, vShader)
  gl.compileShader(vsh)
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in vertex shader:  ' + gl.getShaderInfoLog(vsh))
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(fsh, fShader)
  gl.compileShader(fsh)
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in fragment shader:  ' + gl.getShaderInfoLog(fsh))
  }
  let prog = gl.createProgram()
  gl.attachShader(prog, vsh)
  gl.attachShader(prog, fsh)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Link error in program:  ' + gl.getProgramInfoLog(prog))
  }
  return prog
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  let canvas
  try {
    canvas = document.getElementById('webglcanvas')
    gl = canvas.getContext('webgl')
    if (!gl) {
      throw 'Browser does not support WebGL'
    }
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not get a WebGL graphics context.</p>'
    return
  }
  try {
    initGL() // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not initialize the WebGL graphics context: ' + e + '</p>'
    return
  }

  spaceball = new TrackballRotator(canvas, draw, 0)

  draw()
}
