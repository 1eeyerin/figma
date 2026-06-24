import { handleMessage } from './handlers'

figma.showUI(__html__, { width: 300, height: 220 })

figma.ui.onmessage = (msg) => handleMessage(msg)
