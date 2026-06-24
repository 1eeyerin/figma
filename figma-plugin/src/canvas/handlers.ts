import { createRect, createText, createFrame, appendToParent, createNodeFromTree } from './nodes'
import { getNodeById, serializeNode, exportNode } from './nodeQuery'

type Msg = any

function reply(msg: Msg, extra: object) {
  figma.ui.postMessage({ type: 'DRAW_RESULT', id: msg.id, action: msg.action, ...extra })
}

export async function handleMessage(msg: Msg): Promise<void> {
  if (!msg || typeof msg.type !== 'string') return

  switch (msg.type) {
    case 'LOG':
      console.log('[Plugin]', msg.message)
      break

    case 'PING':
      figma.ui.postMessage({ type: 'PONG' })
      break

    case 'CLOSE':
      figma.closePlugin()
      break

    case 'DRAW_RECT': {
      try {
        const rect = createRect(msg)
        appendToParent(rect, msg.parentId)
        reply(msg, { nodeId: rect.id, success: true })
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        figma.notify('사각형 생성 실패: ' + error, { error: true })
        reply(msg, { success: false, error })
      }
      break
    }

    case 'DRAW_TEXT': {
      try {
        const text = await createText(msg)
        appendToParent(text, msg.parentId)
        reply(msg, { nodeId: text.id, success: true })
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        figma.notify('텍스트 생성 실패: ' + error, { error: true })
        reply(msg, { success: false, error })
      }
      break
    }

    case 'DRAW_FRAME': {
      try {
        const frame = createFrame(msg)
        appendToParent(frame, msg.parentId)
        reply(msg, { nodeId: frame.id, success: true })
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        figma.notify('프레임 생성 실패: ' + error, { error: true })
        reply(msg, { success: false, error })
      }
      break
    }

    case 'SET_PARENT': {
      try {
        const node = getNodeById(msg.nodeId) as SceneNode | null
        const newParent = getNodeById(msg.parentId) as (BaseNode & ChildrenMixin) | null
        if (!node) throw new Error(`노드를 찾을 수 없음: ${msg.nodeId}`)
        if (!newParent || !('appendChild' in newParent))
          throw new Error(`부모 노드가 없거나 자식을 가질 수 없음: ${msg.parentId}`)
        if (typeof msg.index === 'number') {
          newParent.insertChild(msg.index, node)
        } else {
          newParent.appendChild(node)
        }
        reply(msg, { nodeId: node.id, success: true })
      } catch (e) {
        reply(msg, { success: false, error: e instanceof Error ? e.message : String(e) })
      }
      break
    }

    case 'SET_NAME': {
      try {
        const node = getNodeById(msg.nodeId) as SceneNode | null
        if (!node) throw new Error(`노드를 찾을 수 없음: ${msg.nodeId}`)
        node.name = msg.name
        reply(msg, { nodeId: node.id, success: true })
      } catch (e) {
        reply(msg, { success: false, error: e instanceof Error ? e.message : String(e) })
      }
      break
    }

    case 'REMOVE_NODE': {
      try {
        const node = getNodeById(msg.nodeId) as SceneNode | null
        if (!node) throw new Error(`노드를 찾을 수 없음: ${msg.nodeId}`)
        node.remove()
        reply(msg, { success: true })
      } catch (e) {
        reply(msg, { success: false, error: e instanceof Error ? e.message : String(e) })
      }
      break
    }

    case 'GET_NODE': {
      try {
        const node = (msg.nodeId ? getNodeById(msg.nodeId) : figma.currentPage.selection[0]) as SceneNode | null
        if (!node) throw new Error('노드를 찾을 수 없습니다')
        reply(msg, { success: true, result: serializeNode(node) })
      } catch (e) {
        reply(msg, { success: false, error: e instanceof Error ? e.message : String(e) })
      }
      break
    }

    case 'GET_PAGE': {
      try {
        reply(msg, { success: true, result: figma.currentPage.children.map(serializeNode) })
      } catch (e) {
        reply(msg, { success: false, error: e instanceof Error ? e.message : String(e) })
      }
      break
    }

    case 'EXPORT_NODE': {
      try {
        const node = (msg.nodeId ? getNodeById(msg.nodeId) : figma.currentPage.selection[0]) as SceneNode | null
        if (!node) throw new Error('노드를 찾을 수 없습니다')
        const base64 = await exportNode(node, msg.scale)
        reply(msg, { success: true, result: { base64, nodeId: node.id } })
      } catch (e) {
        reply(msg, { success: false, error: e instanceof Error ? e.message : String(e) })
      }
      break
    }

    case 'CREATE_SCREEN': {
      try {
        const parent = (msg.parentId ? getNodeById(msg.parentId) : null) as (BaseNode & ChildrenMixin) | null
        const root = await createNodeFromTree(msg.tree, parent ?? figma.currentPage)
        figma.currentPage.selection = [root]
        figma.viewport.scrollAndZoomIntoView([root])
        reply(msg, { nodeId: root.id, success: true })
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        figma.notify('스크린 생성 실패: ' + error, { error: true })
        reply(msg, { success: false, error })
      }
      break
    }

    default:
      break
  }
}
