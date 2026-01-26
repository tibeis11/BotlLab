export function safeRemove(node: Node | null | undefined): void {
  if (!node) return;
  try {
    // Prefer the standard `remove()` when available
    const anyNode = node as any;
    if (typeof anyNode.remove === 'function') {
      anyNode.remove();
      return;
    }

    const parent = node.parentNode;
    if (parent && parent.contains(node)) {
      parent.removeChild(node);
    }
  } catch (e) {
    try {
      if (node.parentNode) node.parentNode.removeChild(node);
    } catch (_) {
      // swallow - best effort only
    }
  }
}

export default safeRemove;
