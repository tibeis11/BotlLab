"use client";

import { useEffect } from "react";

export default function SafeDOMPatch() {
  useEffect(() => {
    // Keep the original generic signature
    const origRemoveChild = Node.prototype.removeChild as <T extends Node>(child: T) => T;

    function safeRemoveChild<T extends Node>(this: Node, child: T): T {
      try {
        if (!child) return child;
        // Only remove if child is actually a direct child of this node
        if (child.parentNode === this) {
          return origRemoveChild.call(this, child) as T;
        }
        return child;
      } catch (e) {
        // swallow exceptions caused by removeChild when node is not found
        return child;
      }
    }

    // Patch only if not already patched
    if ((Node.prototype.removeChild as any).__isPatched !== true) {
      (safeRemoveChild as any).__isPatched = true;
      Node.prototype.removeChild = safeRemoveChild as any;
    }

    return () => {
      try {
        // attempt to restore original on unmount
        if ((Node.prototype.removeChild as any).__isPatched) {
          Node.prototype.removeChild = origRemoveChild;
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return null;
}
