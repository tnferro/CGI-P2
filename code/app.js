import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten } from "../../libs/MV.js";
import { modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, multTranslation, popMatrix, pushMatrix } from "../../libs/stack.js";

import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js'
import * as SPHERE from '../../libs/objects/sphere.js';


/**
 * Constants
 */
const VP_DISTANCE = 1;

const GRAY = vec3(0.5, 0.5, 0.5);
const RED = vec3(1, 0, 0);
const GREEN = vec3(0, 1, 0);
const BLUE = vec3(0, 0, 1);
const YELLOW = vec3(1, 1, 0);
const BLACK = vec3(0, 0, 0);


function setup(shaders) {
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    /** @type WebGL2RenderingContext */
    let gl = setupWebGL(canvas);

    // Drawing mode (gl.LINES or gl.TRIANGLES)
    let mode = gl.LINES;

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-VP_DISTANCE * aspect, VP_DISTANCE * aspect, -VP_DISTANCE, VP_DISTANCE, -3 * VP_DISTANCE, 3 * VP_DISTANCE);
    let mView = lookAt([2, 1.2, 1], [0, 0.6, 0], [0, 1, 0]);

    let zoom = 1.0;

    /** Model parameters */
    let ag = 0;
    let rg = 0;
    let rb = 0;
    let rc = 0;

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function (event) {
        switch (event.key) {
            case 'h':
                //Toggle this panel

                break;
            case '0':
                //Toggle 1/4 views

                break;
            case '1':
                //Front view

                break;
            case '2':
                //Left view

                break;
            case '3':
                //Top view

                break;
            case '4':
                //4th view

                break;
            case '8':
                //Toggle 4th view (Oblique vs Axonometric)

                break;
            case '9':
                //Parallel vs Perspective

                break;
            case '':
                //Toggle wireframe/solid

                break;
            case 'q':
                //Move forward

                break;
            case 'e':
                //Move backward

                break;
            case 'w':
                //Raise cannon

                break;
            case 's':
                //Lower cannon

                break;
            case 'a':
                //Rotate cabin ccw

                break;
            case 'd':
                //Rotate cabin cw

                break;
            case 'r':
                //Reset view parameters

                break;
            case 'ArrowLeft':
                //Increase theta

                break;
            case 'ArrowRight':
                //Decrease theta

                break;
            case 'ArrowUp':
                //Increase gamma

                break;
            case 'ArrowDown':
                //Decrease gamma

                break;
        }
    }

    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test

    CUBE.init(gl);
    CYLINDER.init(gl);
    SPHERE.init(gl);

    window.requestAnimationFrame(render);


    function resize_canvas(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0, 0, canvas.width, canvas.height);
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

    function UpperArm() {
        pushMatrix()
        multScale([0.4, 0.1, 0.4]);
        multTranslation([0, 0.5, 0]);

        uploadModelView();
        CYLINDER.draw(gl, program, mode);
        popMatrix()
        multTranslation([0, 0.1, 0]);
        multScale([0.05, 0.6, 0.05]);
        multTranslation([0, 0.5, 0]);

        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function LowerArmAndClaw() {
        multRotationZ(rc);
        pushMatrix();
        LowerArm();
        popMatrix();
        multTranslation([0, 0.45, 0]);
        Claw();
    }

    function LowerArm() {
        pushMatrix();
        multScale([0.1, 0.1, 0.05]);
        multRotationX(90);

        uploadModelView();
        CYLINDER.draw(gl, program, mode);
        popMatrix();
        multTranslation([0, 0.05, 0]);
        multScale([0.05, 0.4, 0.05]);
        multTranslation([0, 0.5, 0]);

        uploadModelView();
        CUBE.draw(gl, program, mode);
    }


    function Claw() {
        multRotationY(rg)
        // Fist
        pushMatrix();
        multScale([0.2, 0.05, 0.2]);
        multTranslation([0, -0.5, 0]);

        uploadModelView();
        CYLINDER.draw(gl, program, mode);
        popMatrix();
        // Maxilla 1
        pushMatrix();
        multTranslation([ag, 0, 0]);
        multScale([0.02, 0.15, 0.1]);
        multTranslation([0.5, 0.5, 0]);

        uploadModelView();
        CUBE.draw(gl, program, mode);
        popMatrix();
        // Maxilla 2
        multTranslation([-ag, 0, 0]);
        multScale([0.02, 0.15, 0.1]);
        multTranslation([-0.5, 0.5, 0]);

        uploadModelView();
        CUBE.draw(gl, program, mode);
    }

    function RobotArm() {
        multRotationY(rb);
        pushMatrix();
        UpperArm();
        popMatrix();
        multTranslation([0, 0.7, 0]);

        multTranslation([0, 0.05, 0]);
        LowerArmAndClaw();
    }

    function render() {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        // Send the mProjection matrix to the GLSL program
        mProjection = ortho(-aspect * zoom, aspect * zoom, -zoom, zoom, 0.01, 3);
        uploadProjection(mProjection);

        // Load the ModelView matrix with the Worl to Camera (View) matrix
        loadMatrix(mView);

        //Claw();
        //LowerArm();
        //LowerArmAndClaw();
        //UpperArm();
        RobotArm();
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))