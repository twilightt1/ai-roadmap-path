type EditorDocument = {
  toString(): string;
  length: number;
};

type EditorLike = {
  state: { doc: EditorDocument };
  dispatch(transaction: { changes: { from: number; to: number; insert: string } }): void;
};

/** Apply parent-owned editor state without disrupting normal user typing. */
export function syncExternalEditorValue(view: EditorLike, value: string): void {
  if (view.state.doc.toString() === value) return;
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: value,
    },
  });
}
