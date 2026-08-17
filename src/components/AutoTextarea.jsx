import { useEffect, useRef } from 'react'

// A textarea that grows with its content instead of clipping it behind an
// inner scrollbar. The questionnaires (Trainingsfokus, Matchanalyse) are the
// reason: answers there routinely run several lines, and the browser default
// of two rows hid everything past the second one.
//
// Height is measured, not guessed: scrollHeight is the content's natural
// height. Setting height to 'auto' first matters — otherwise scrollHeight
// only ever reports the height already set and the box can never shrink again
// after deleting text. The border has to be added back because everything
// here is box-sizing: border-box (theme.css:51), where the height property
// covers the border too while scrollHeight does not.
function resize(el) {
  if (!el) return
  el.style.height = 'auto'
  // A field inside a hidden panel (the Matchanalyse switches between form
  // panels) has no layout, so scrollHeight reads 0 — writing that back would
  // collapse the box to nothing, and nothing would re-expand it when the panel
  // is shown again. Leave it alone and let the CSS min-height stand until it
  // can actually be measured.
  if (!el.scrollHeight) {
    el.style.height = ''
    return
  }
  el.style.height = el.scrollHeight + (el.offsetHeight - el.clientHeight) + 'px'
}

export default function AutoTextarea({ value, onChange, style, ...rest }) {
  const ref = useRef(null)

  // Runs on the value too, not just on typing: loading a saved record fills
  // the field programmatically, and that has to size the box as well.
  useEffect(() => {
    resize(ref.current)
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        resize(e.target)
        onChange?.(e)
      }}
      // overflow-y hidden so no scrollbar flickers while the box is resizing;
      // resize:vertical stays available for anyone who wants to drag it larger.
      style={{ overflowY: 'hidden', ...style }}
      {...rest}
    />
  )
}
