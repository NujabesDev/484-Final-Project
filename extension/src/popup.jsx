import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function Popup() {
  return (
    <div style={{ width: '300px', height: '200px', padding: '20px' }}>
      Hello
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Popup />)
