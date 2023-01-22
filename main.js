'use strict'

let gl // The webgl context.
let surface // A surface model
let shProgram // A shader program
let spaceball // A SimpleRotator object that lets the user rotate the view by mouse.
let t = 0.0
let point = { x: 0, y: 0 }

function deg2rad(angle) {
  return (angle * Math.PI) / 180
}

// Constructor
function Model(name) {
  this.name = name
  this.iVertexBuffer = gl.createBuffer()
  this.iNormalBuffer = gl.createBuffer()
  this.iTextureBuffer = gl.createBuffer()
  this.count = 0

  this.BufferData = function ({ vertexList, normalList, textureList }) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexList), gl.STREAM_DRAW)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalList), gl.STREAM_DRAW)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureList),
      gl.STREAM_DRAW
    )

    this.count = vertexList.length / 3
  }

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer)
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(shProgram.iAttribVertex)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer)
    gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, true, 0, 0)
    gl.enableVertexAttribArray(shProgram.iNormal)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer)
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(shProgram.iTextureCoords)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count)
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

  this.iNormal = -1
  this.iNormalMatrix = -1

  this.iLightPosition = -1
  this.iLightVec = -1

  this.iAmbientColor = -1
  this.iDiffuseColor = -1
  this.iSpecularColor = -1
  this.iShininess = -1

  this.iTextureCoords = -1
  this.iTextureU = -1

  this.iTextureAngle = -1
  this.iTexturePoint = -1

  this.Use = function () {
    gl.useProgram(this.prog)
  }
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  const angle = document.getElementById('rotAngle').value
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  gl.enable(gl.CULL_FACE)
  gl.enable(gl.DEPTH_TEST)

  /* Set the values of the projection transformation */
  let projection = m4.perspective(Math.PI / 8, 1, 8, 12)

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix()

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7)
  let translateToPointZero = m4.translation(0, 0, -10)

  let matAccum0 = m4.multiply(rotateToPointZero, modelView)
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0)
  let modelViewInverse = m4.inverse(matAccum1, new Float32Array(16))
  let normalMatrix = m4.transpose(modelViewInverse, new Float32Array(16))

  /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1)
  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  )

  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix)

  gl.uniform3fv(shProgram.iLightPosition, lightCoordinates())
  gl.uniform3fv(shProgram.iLightDirection, [1, 0, 0])

  gl.uniform3fv(shProgram.iLightVec, new Float32Array(3))

  gl.uniform1f(shProgram.iShininess, 1.5)

  gl.uniform3fv(shProgram.iAmbientColor, [0.0, 0.0, 0.0])
  gl.uniform3fv(shProgram.iDiffuseColor, [0.034, 0.537, 0.85])
  gl.uniform3fv(shProgram.iSpecularColor, [0.0, 0.0, 0.0])

  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1])

  gl.uniform1f(shProgram.iTextureAngle, deg2rad(+angle))

  gl.uniform2fv(shProgram.iTexturePoint, [
    calcX(point.x, point.y, 3, 2, 7),
    calcY(point.x, point.y, 3, 2, 7),
  ])

  gl.uniform1i(shProgram.iTextureU, 0)

  surface.Draw()
}

function CreateSurfaceData() {
  let vertexList = []
  let normalList = []
  let textureList = []
  let deltaV0 = 0.03
  let deltaPhi = 0.03
  let R = 2
  let n = 7
  let a = 3
  let zoom = 3
  //let step = 0.01
  for (let v0 = 0; v0 <= Math.PI; v0 += deltaV0) {
    for (let phi = 0; phi <= 2 * Math.PI; phi += deltaPhi) {
      let x = calcX(v0, phi, a, R, n)
      let y = calcY(v0, phi, a, R, n)
      let z = calcZ(v0, R)
      vertexList.push(x / zoom, y / zoom, z / zoom)

      x = calcX(v0 + deltaV0, phi, a, R, n)
      y = calcY(v0 + deltaV0, phi, a, R, n)
      z = calcZ(v0 + deltaV0, R)
      vertexList.push(x / zoom, y / zoom, z / zoom)

      let normal = m4.cross(
        calcDerV0(v0, phi, deltaV0, a, R, n),
        calcDerPhi(v0, phi, deltaPhi, a, R, n)
      )
      normalList.push(normal[0] / zoom, normal[1] / zoom, normal[2] / zoom)

      normal = m4.cross(
        calcDerV0(v0 + deltaV0, phi, deltaV0, a, R, n),
        calcDerPhi(v0 + deltaV0, phi, deltaPhi, a, R, n)
      )
      normalList.push(normal[0] / zoom, normal[1] / zoom, normal[2] / zoom)

      textureList.push(...calcTextureUV(v0, phi))
      textureList.push(...calcTextureUV(v0 + deltaV0, phi + deltaPhi))
    }
  }
  return { vertexList, normalList, textureList }
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

const calcTextureUV = (u, v) => [(u + 5) / 3, v / 2]

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

  shProgram.iNormal = gl.getAttribLocation(prog, 'normal')
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, 'normalMatrix')

  shProgram.iAmbientColor = gl.getUniformLocation(prog, 'ambientColor')
  shProgram.iDiffuseColor = gl.getUniformLocation(prog, 'diffuseColor')
  shProgram.iSpecularColor = gl.getUniformLocation(prog, 'specularColor')

  shProgram.iShininess = gl.getUniformLocation(prog, 'shininess')

  shProgram.iLightPosition = gl.getUniformLocation(prog, 'lightPosition')
  shProgram.iLightVec = gl.getUniformLocation(prog, 'lightDirection')

  shProgram.iTextureCoords = gl.getAttribLocation(prog, 'textureCoords')
  shProgram.iTextureU = gl.getUniformLocation(prog, 'uTexture')

  shProgram.iTextureAngle = gl.getUniformLocation(prog, 'textureAngle')
  shProgram.iTexturePoint = gl.getUniformLocation(prog, 'texturePoint')

  surface = new Model('Surface')
  surface.BufferData(CreateSurfaceData())

  loadTexture()

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

const lightCoordinates = () => {
  let r = 1.3
  let coordx = r * Math.cos(t)
  let coordy = r * Math.sin(t)
  return [coordx, coordy, 3]
}

const onArrowLeft = () => {
  t -= 0.1
  draw()
}

const onArrowRight = () => {
  t += 0.1
  draw()
}

window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      onArrowLeft()
      break
    case 'ArrowRight':
      onArrowRight()
      break
    case 'd':
      point.x = point.x + 0.1
      draw()
      break
    case 'a':
      point.x = point.x - 0.1
    case 'w':
      point.y = point.y + 0.1
      draw()
      break
    case 's':
      point.y = point.y - 0.1
      draw()
      break
    default:
      break
  }
})

function loadTexture() {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src =
    'https://www.the3rdsequence.com/texturedb/download/258/texture/jpg/2048/yellow+bananas-2048x2048.jpg'
  image.onload = () => {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    draw()
  }
}
