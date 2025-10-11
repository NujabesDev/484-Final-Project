import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import browser from 'webextension-polyfill'

function Popup() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if user is logged in
    browser.storage.local.get('user').then(result => {
      if (result.user) {
        setUser(result.user)
      }
    })
  }, [])

  return (
    <div className="w-[300px] h-[200px] p-5 flex flex-col items-center justify-center space-y-4">
      <h2 className="text-xl font-semibold">Read Later Random</h2>
      {user ? (
        <div className="text-center space-y-2">
          <p className="text-sm">Hello, {user.email}!</p>
          <p className="text-xs text-muted-foreground">Logged in</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center">
          Visit the website to sign in
        </p>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Popup />)
