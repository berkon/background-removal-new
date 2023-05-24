const path = require("path");
const { contextBridge } = require('electron')
const { requireTs } = require("require-ts-module");

const tasksVisionModule = requireTs("@mediapipe/tasks-vision");

contextBridge.exposeInMainWorld('electron', {
    forVisionTasks: async (path) => await tasksVisionModule.default.FilesetResolver.forVisionTasks(path),
    createFromOptions: async (vision, options) => await tasksVisionModule.default.ImageSegmenter.createFromOptions(vision, options)
});
