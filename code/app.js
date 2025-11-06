import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../libs/utils.js";
import { ortho, lookAt, flatten, vec3, rotateX, rotateY, mult, perspective } from "../libs/MV.js";
import { modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, multTranslation, popMatrix, pushMatrix } from "../libs/stack.js";

import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as SPHERE from '../../libs/objects/sphere.js';

/**
 * Constants
 */
const VP_DISTANCE = 35;

const GRAY = vec3(0.5, 0.5, 0.5);
const RED = vec3(1, 0, 0);
const GREEN = vec3(0, 1, 0);
const DARK_GREEN = vec3(0.0, 0.25, 0.0);
const EVEN_DARKER_GREEN = vec3(0.0, 0.2, 0.0);
const DARKEST_GREEN = vec3(0.0, 0.1, 0.0);
const BLUE = vec3(0, 0, 1);
const YELLOW = vec3(1, 1, 0);
const BLACK = vec3(0, 0, 0);
const WHITE_GREY = vec3(0.9, 0.9, 0.9);
const LIGHT_GREY = vec3(0.7, 0.7, 0.7);
const DARK_GREY = vec3(0.3, 0.3, 0.3);

const WHEEL_HEIGHT = 1;
const WHEEL_LENGHT = 1;

const BODY_BASE_HEIGHT = 0.7;
const BODY_BASE_LENGHT = 7.5;
const BODY_BASE_WIDTH = 7.9;

const BODY_SUPPORT_LENGHT = 8.5;
const BODY_SUPPORT_WIDTH = 10;

const CABIN_HEIGHT = 3;
const CABIN_LENGHT = 5;
const CABIN_WIDTH = 5;

const CANNON_ROTATOR_VALUES = 1;


const FLOOR_DIAMETER = 2;
const FLOOR_HEIGHT = 0.3;

/**
 * Flag to determine if four views are displayed
 * @type {boolean}
 */
let isFourViews = false;

/**
 * Flag to determine if the orthogonal projection is axonometric or oblique
 * @type {boolean}
 */
let isAxonometric = false;

/**
 * Flag to determine if the projection is Perspective or Orthogonal
 * @type {boolean}
 */
let isPerspective = false;

function setup(shaders) {
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    /** @type WebGL2RenderingContext */
    let gl = setupWebGL(canvas);

    // Drawing mode (gl.LINES or gl.TRIANGLES)
    let mode = gl.TRIANGLES;

    let gamma = 10; // Initial gamma angle
    let theta = 60; // Initial theta angle

    // Get elements to display angles
    let gammaElement = document.getElementById('gamma');
    let thetaElement = document.getElementById('theta');

    // Update displayed angles
    gammaElement.textContent = `Gamma: ${gamma}°`;
    thetaElement.textContent = `Theta: ${theta}°`;

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-VP_DISTANCE * aspect, VP_DISTANCE * aspect, -VP_DISTANCE, VP_DISTANCE, -3 * VP_DISTANCE, 3 * VP_DISTANCE);

    let axView = mult(lookAt([0, 0, VP_DISTANCE], [0, 0, 0], [0, 1, 0]), mult(rotateX(gamma), rotateY(theta)));
    let obliqueView = mult(lookAt([VP_DISTANCE, VP_DISTANCE / 2, VP_DISTANCE], [0, 0, 0], [0, 1, 0]), mult(rotateX(0), rotateY(0)));
    let mView = axView; // Initialize model view matrix

    let zoom = 1.0;

    /** Model parameters */
    let wheelRotation = 0;
    let cannonRotator = 0;
    let mt = 0;
    let rc = 0;
    let mc = 0;

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    // Event listener for mouse wheel to zoom in/out
    canvas.addEventListener('wheel', (event) => {
        if (event.deltaY > 0)
            zoom *= 1.1; // Zoom in
        else zoom /= 1.1; // Zoom out
    });

    document.onkeydown = function (event) {
        switch (event.key) {
            case 'h':
                //Toggle this panel
                document.getElementById('commands').classList.toggle('hidden');
                break;
            case '0':
                //Toggle 1/4 views
                isPerspective = false;
                isFourViews = !isFourViews;
                break;
            case '1':
                //Front view
                isPerspective = false;
                isFourViews = false;
                mView = lookAt([0, 0.6, 1], [0, 0.6, 0], [0, 1, 0]);
                break;
            case '2':
                //Left view
                isPerspective = false;
                isFourViews = false;
                mView = lookAt([-1, 0.6, 0], [0, 0.6, 0], [0, 1, 0]);
                break;
            case '3':
                //Top view
                isPerspective = false;
                isFourViews = false;
                mView = lookAt([0, 2, 0], [0, 0.6, 0], [0, 0, 1]);
                break;
            case '4':
                //4th view
                isPerspective = false;
                isFourViews = false;
                isAxonometric = true;
                mView = axView;
                break;
            case '8':
                //Toggle 4th view (Oblique vs Axonometric)
                isPerspective = false;
                isFourViews = false;
                if (!isAxonometric) {
                    mView = obliqueView;
                }
                else {
                    mView = axView;
                }
                isAxonometric = !isAxonometric
                break;
            case '9':
                //Parallel vs Perspective
                isFourViews = false;
                isPerspective = !isPerspective;
                break;
            case ' ':
                //Toggle wireframe/solid
                mode = mode === gl.LINES ? gl.TRIANGLES : gl.LINES;
                break;
            case 'q':
                //Move forward
                if (mt > -22) {
                    wheelRotation += 1;
                    mt -= 0.1;
                }
                break;
            case 'e':
                //Move backward
                if (mt < 20) {
                    wheelRotation -= 1;
                    mt += 0.1;
                }
                break;
            case 'w':
                //Raise cannon
                if (mc < 45) {
                    cannonRotator += 1;
                    mc += 1;
                }
                break;
            case 's':
                //Lower cannon
                if (mc > -10) {
                    cannonRotator -= 1;
                    mc -= 1;
                }
                break;
            case 'a':
                //Rotate cabin ccw
                if (rc < 180) rc += 1;
                break;
            case 'd':
                //Rotate cabin cw
                if (rc > -180) rc -= 1;
                break;
            case 'r':
                //Reset view parameters
                isFourViews = false;
                isAxonometric = true;
                mView = axView;
                gamma = 10;
                theta = 60;
                updateAngles();
                zoom = 1.0;
                break;
            case 'ArrowLeft':
                //Increase theta
                if (theta < 360) theta += 1;
                else theta = 0;
                updateAngles(); // Update angles displayed
                break;
            case 'ArrowRight':
                //Decrease theta
                if (theta > -360) theta -= 1;
                else theta = 0;
                updateAngles(); // Update angles displayed
                break;
            case 'ArrowUp':
                //Increase gamma
                if (gamma < 360) gamma += 1;
                else gamma = 0;
                updateAngles(); // Update angles displayed
                break;
            case 'ArrowDown':
                //Decrease gamma
                if (gamma > -360) gamma -= 1;
                else gamma = 0;
                updateAngles(); // Update angles displayed
                break;
        }
    }

    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test

    CUBE.init(gl);
    CYLINDER.init(gl);
    SPHERE.init(gl);

    window.requestAnimationFrame(render);


    function getAxonometricView(gamma, theta) {
        loadMatrix(lookAt([0, 0, VP_DISTANCE], [0, 0, 0], [0, 1, 0]));
        multRotationX(gamma);
        multRotationY(theta);
        return modelView();
    }

    /**
     * Updates the angles displayed on the control panel
     */
    function updateAngles() {
        gammaElement.textContent = `Gamma: ${gamma}°`;
        thetaElement.textContent = `Theta: ${theta}°`;
        axView = getAxonometricView(gamma, theta);
        mView = axView;
    }

    function resize_canvas(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0, 0, canvas.width, canvas.height);

        if (isPerspective) {
            const fovy = 45 * zoom;
            mProjection = perspective(fovy, aspect, 0.01, 100);
        }
        else
            mProjection = ortho(-aspect * zoom, aspect * zoom, -zoom, zoom, 0.01, 3);
    }

    function drawObjects(obj, color) {
        uploadModelView();
        const uColor = gl.getUniformLocation(program, "u_color");
        gl.uniform3fv(uColor, color);
        obj.draw(gl, program, gl.TRIANGLES);
        gl.uniform3fv(uColor, BLACK);
        obj.draw(gl, program, gl.LINES);
    }

    function uploadProjection() {
        uploadMatrix("u_projection", mProjection);
    }

    function uploadModelView() {
        uploadMatrix("u_model_view", modelView());
    }

    function uploadMatrix(name, m) {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, flatten(m));
    }

    function drawWheel(x, z) {
        pushMatrix();
        multTranslation([x, WHEEL_HEIGHT / 2, z]);
        multRotationZ(90);
        multRotationY(wheelRotation);

        pushMatrix();
        multScale([WHEEL_LENGHT, WHEEL_HEIGHT, WHEEL_LENGHT]);
        drawObjects(CYLINDER, BLACK);
        popMatrix();

        multScale([WHEEL_LENGHT - 0.2, WHEEL_HEIGHT + 0.1, WHEEL_LENGHT - 0.2]);
        drawObjects(CYLINDER, LIGHT_GREY);
        popMatrix();
    }

    function drawWheels() {
        const wheelSpacing = 1.2;
        const wheelBaseWidth = 4.5;
        const numWheels = 6;

        const startZ = -(numWheels - 1) * wheelSpacing / 2;

        for (let i = 0; i < numWheels; i++) {
            const zPos = startZ + i * wheelSpacing;

            //Left Side
            pushMatrix();
            multTranslation([-wheelBaseWidth, WHEEL_HEIGHT / 2, zPos]);
            multRotationX(-(mt * 360) / 10);
            multTranslation([wheelBaseWidth, -WHEEL_HEIGHT / 2, -zPos]);
            drawWheel(-wheelBaseWidth, zPos);
            popMatrix();

            //Right Side
            pushMatrix();
            multTranslation([wheelBaseWidth, WHEEL_HEIGHT / 2, zPos]);
            multRotationX(-(mt * 360) / 10);
            multTranslation([-wheelBaseWidth, -WHEEL_HEIGHT / 2, -zPos]);
            drawWheel(wheelBaseWidth, zPos);
            popMatrix();
        }
    }

    function drawBodyBase() {
        pushMatrix();
        multTranslation([0, WHEEL_HEIGHT, 0]);
        multScale([BODY_BASE_WIDTH, BODY_BASE_HEIGHT + 0.5 / 2, BODY_BASE_LENGHT]);
        multTranslation([0, -WHEEL_HEIGHT / 2 + 0.1, 0]);
        drawObjects(CUBE, DARK_GREEN);
        popMatrix();
    }

    function drawBodySupport() {
        pushMatrix();
        multTranslation([0, WHEEL_HEIGHT + 0.5, 0]);
        multScale([BODY_SUPPORT_WIDTH, BODY_BASE_HEIGHT + 0.2, BODY_SUPPORT_LENGHT]);
        drawObjects(CUBE, EVEN_DARKER_GREEN);
        popMatrix();
    }

    function drawBody() {
        drawBodyBase();
        drawBodySupport();
    }

    function drawCabin() {
        pushMatrix();
        multTranslation([0, WHEEL_HEIGHT + 1.9, 0]);
        multScale([CABIN_WIDTH + 0.5, CABIN_HEIGHT - 1, CABIN_LENGHT + 0.5]);
        drawObjects(CUBE, DARKEST_GREEN);
        popMatrix();
    }

    function drawCannonRotator() {
        pushMatrix();
        multTranslation([0, CABIN_HEIGHT, -2.5]);
        multRotationX(90);
        multRotationZ(90);
        multScale([CANNON_ROTATOR_VALUES, CANNON_ROTATOR_VALUES, CANNON_ROTATOR_VALUES]);
        drawObjects(CYLINDER, DARK_GREY);
        popMatrix();
    }

    function drawCannon() {
        pushMatrix();
        multTranslation([0, CABIN_HEIGHT, -5.5]);
        multRotationX(90);
        multScale([0.3, 5, 0.3]);
        drawObjects(CYLINDER, BLACK);
        popMatrix();
    }




    function render() {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        // Send the mProjection matrix to the GLSL program
        if (isPerspective) {
            const fovy = 45 * zoom;
            mProjection = perspective(fovy, aspect, 0.01, 100);
        }
        else {
            mProjection = ortho(-aspect * zoom, aspect * zoom, -zoom, zoom, 0.01, 3);
        }
        uploadProjection(mProjection);

        if (isFourViews)
            renderFourViews();
        else {
            gl.viewport(0, 0, canvas.width, canvas.height);
            renderScene();
        }
    }

    /**
     * Renders the scene from the current perspective
     */
    function renderScene() {
        if (isPerspective) {
            const fovy = 45 * zoom;
            mProjection = perspective(fovy, aspect, 0.01, 100);
        }
        else {
            mProjection = ortho(-VP_DISTANCE * aspect * zoom, VP_DISTANCE * aspect * zoom, -VP_DISTANCE * zoom, VP_DISTANCE * zoom, 0.01, 100);
        }
        uploadProjection(mProjection);
        loadMatrix(mView);

        drawFloor();
        pushMatrix();
        multTranslation([0, 0, mt]);
        drawWheels();
        drawBody();

        pushMatrix();
        multRotationY(rc);
        drawCabin();
        drawCannonRotator();

        pushMatrix();
        multRotationX(mc);
        drawCannon();

        popMatrix();

        popMatrix();

        popMatrix();
    }

    /**
     * Renders the scene from four different views.
     */
    function renderFourViews() {
        const halfWidth = gl.canvas.width / 2;
        const halfHeight = gl.canvas.height / 2;

        //Front View
        gl.viewport(0, halfHeight, halfWidth, halfHeight);
        mView = lookAt([0, 0, -VP_DISTANCE], [0, 0, 0], [0, 1, 0]);
        renderScene();

        //Left Side View
        gl.viewport(halfWidth, halfHeight, halfWidth, halfHeight);
        mView = lookAt([-VP_DISTANCE, 0, 0], [0, 0, 0], [0, 1, 0]);
        renderScene();

        //Top View
        gl.viewport(0, 0, halfWidth, halfHeight);
        mView = lookAt([0, VP_DISTANCE, 0], [0, 0, 0], [0, 0, -1]);
        renderScene();

        //Axonometric or Oblique View
        gl.viewport(halfWidth, 0, halfWidth, halfHeight);
        mView = !isAxonometric ? obliqueView : axView;
        renderScene();
    }

    /**
     * Draws a cube on the floor at specified x and z coordinates
     * @param x coordinate x
     * @param z coordinate z
     */

    function drawFloorCube(x, z) {
        pushMatrix();
        if ((x + z) % 2 === 0) {
            gl.uniform3f(gl.getUniformLocation(program, "u_color"), WHITE_GREY[0], WHITE_GREY[1], WHITE_GREY[2], WHITE_GREY[3]);
        } else {
            gl.uniform3f(gl.getUniformLocation(program, "u_color"), LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2], LIGHT_GREY[3]);
        }
        multTranslation([x, 0, z]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
        popMatrix();
    }

    /**
     * Draws the entire floor using cubes.
     */
    function drawFloor() {
        pushMatrix();
        multScale([FLOOR_DIAMETER, FLOOR_HEIGHT, FLOOR_DIAMETER]);
        multTranslation([0, -0.5, 0]);
        for (let x = -12; x < 12; x++) {
            for (let z = -12; z < 12; z++) {
                drawFloorCube(x, z);
            }
        }
        popMatrix();
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))