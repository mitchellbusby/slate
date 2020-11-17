import React, { useState, useCallback, useMemo } from 'react'
import { Slate, Editable, withReact, ReactEditor } from 'slate-react'
import {
  Editor,
  Range,
  Point,
  Node,
  createEditor,
  Path,
  Ancestor,
  NodeEntry,
  Transforms,
} from 'slate'
import { HistoryEditor, withHistory } from 'slate-history'

const checkAncestors = (
  rootNode: Node,
  path: Path,
  checker: (curr: Ancestor) => boolean
): NodeEntry | null => {
  const ancestorEntries = Array.from(
    Node.ancestors(rootNode, path, { reverse: true })
  )
  return (
    (ancestorEntries.find(nodeEntry => checker(nodeEntry[0])) as NodeEntry) ??
    null
  )
}

const TablesExample = () => {
  const [value, setValue] = useState<Node[]>(initialValue)
  const renderElement = useCallback(props => <Element {...props} />, [])
  const renderLeaf = useCallback(props => <Leaf {...props} />, [])
  const editor = useMemo(
    () => withTables(withHistory(withReact(createEditor()))),
    []
  )

  const onSelectionChanged = () => {
    if (!editor.selection) {
      return false
    }

    const { selection } = editor

    const startPoint = selection.anchor
    const endPoint = selection.focus

    const startNodeEntry = checkAncestors(
      editor,
      startPoint.path,
      t => t.type === 'table'
    )

    const endNodeEntry = checkAncestors(
      editor,
      endPoint.path,
      t => t.type === 'table'
    )

    const selectionStartsOrEndsInTable = !!startNodeEntry || !!endNodeEntry

    if (!selectionStartsOrEndsInTable) {
      return
    }

    const withinOneTable =
      !!startNodeEntry &&
      !!endNodeEntry &&
      Path.equals(startNodeEntry[1], endNodeEntry[1])

    if (withinOneTable) {
      return
    }

    if (startNodeEntry) {
      console.log('start entry')
      if (Range.isForward(editor.selection)) {
        console.log('forward')
        Transforms.select(editor, {
          ...selection,
          anchor: Editor.before(editor, startNodeEntry[1]),
        })
      } else {
        console.log('backwards')

        Transforms.select(editor, {
          ...selection,
          anchor: Editor.after(editor, startNodeEntry[1]),
        })
      }
    }

    if (endNodeEntry) {
      console.log('end entry')

      if (Range.isForward(editor.selection)) {
        console.log('forward')
        Transforms.select(editor, {
          ...selection,
          focus: Editor.after(editor, endNodeEntry[1]),
        })
      } else {
        console.log('backwards')
        Transforms.select(editor, {
          ...selection,
          focus: Editor.before(editor, endNodeEntry[1]),
        })
      }
    }
  }

  const onChange = (value: Node[]) => {
    setValue(value)
    let shouldTrigger = false
    for (const operation of editor.operations) {
      if (operation.type === 'set_selection') {
        // hook in here and do our own thing
        shouldTrigger = true
        break
      }
    }

    if (shouldTrigger) {
      editor.operations = []
      onSelectionChanged()
    }
  }

  return (
    <Slate editor={editor} value={value} onChange={onChange}>
      <Editable renderElement={renderElement} renderLeaf={renderLeaf} />
    </Slate>
  )
}

const withTables = (editor: Editor & ReactEditor & HistoryEditor) => {
  const { deleteBackward, deleteForward, insertBreak } = editor

  editor.deleteBackward = unit => {
    const { selection } = editor

    if (selection && Range.isCollapsed(selection)) {
      const [cell] = Editor.nodes(editor, {
        match: n => n.type === 'table-cell',
      })

      if (cell) {
        const [, cellPath] = cell
        const start = Editor.start(editor, cellPath)

        if (Point.equals(selection.anchor, start)) {
          return
        }
      }
    }

    deleteBackward(unit)
  }

  editor.deleteForward = unit => {
    const { selection } = editor

    if (selection && Range.isCollapsed(selection)) {
      const [cell] = Editor.nodes(editor, {
        match: n => n.type === 'table-cell',
      })

      if (cell) {
        const [, cellPath] = cell
        const end = Editor.end(editor, cellPath)

        if (Point.equals(selection.anchor, end)) {
          return
        }
      }
    }

    deleteForward(unit)
  }

  editor.insertBreak = () => {
    const { selection } = editor

    if (selection) {
      const [table] = Editor.nodes(editor, { match: n => n.type === 'table' })

      if (table) {
        return
      }
    }

    insertBreak()
  }

  return editor
}

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'table':
      return (
        <table>
          <tbody {...attributes}>{children}</tbody>
        </table>
      )
    case 'table-row':
      return <tr {...attributes}>{children}</tr>
    case 'table-cell':
      return <td {...attributes}>{children}</td>
    default:
      return <p {...attributes}>{children}</p>
  }
}

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>
  }

  return <span {...attributes}>{children}</span>
}

const initialValue = [
  {
    children: [
      {
        text:
          'Since the editor is based on a recursive tree model, similar to an HTML document, you can create complex nested structures, like tables:',
      },
    ],
  },
  {
    type: 'table',
    children: [
      {
        type: 'table-row',
        children: [
          {
            type: 'table-cell',
            children: [{ text: '' }],
          },
          {
            type: 'table-cell',
            children: [{ text: 'Human', bold: true }],
          },
          {
            type: 'table-cell',
            children: [{ text: 'Dog', bold: true }],
          },
          {
            type: 'table-cell',
            children: [{ text: 'Cat', bold: true }],
          },
        ],
      },
      {
        type: 'table-row',
        children: [
          {
            type: 'table-cell',
            children: [{ text: '# of Feet', bold: true }],
          },
          {
            type: 'table-cell',
            children: [{ text: '2' }],
          },
          {
            type: 'table-cell',
            children: [{ text: '4' }],
          },
          {
            type: 'table-cell',
            children: [{ text: '4' }],
          },
        ],
      },
      {
        type: 'table-row',
        children: [
          {
            type: 'table-cell',
            children: [{ text: '# of Lives', bold: true }],
          },
          {
            type: 'table-cell',
            children: [{ text: '1' }],
          },
          {
            type: 'table-cell',
            children: [{ text: '1' }],
          },
          {
            type: 'table-cell',
            children: [{ text: '9' }],
          },
        ],
      },
    ],
  },
  {
    children: [
      {
        text:
          "This table is just a basic example of rendering a table, and it doesn't have fancy functionality. But you could augment it to add support for navigating with arrow keys, displaying table headers, adding column and rows, or even formulas if you wanted to get really crazy!",
      },
    ],
  },
]

export default TablesExample
