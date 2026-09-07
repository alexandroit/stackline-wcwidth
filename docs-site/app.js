'use strict'

document.documentElement.classList.add('js')

var status = document.querySelector('.copy-status')

document.querySelectorAll('[data-copy-target]').forEach(function (button) {
  button.addEventListener('click', function () {
    var target = document.getElementById(button.getAttribute('data-copy-target'))
    if (!target || !navigator.clipboard || !navigator.clipboard.writeText) {
      if (status) status.textContent = 'Select the command and copy it manually.'
      return
    }
    navigator.clipboard.writeText(target.textContent).then(function () {
      button.textContent = 'Copied'
      if (status) status.textContent = 'Command copied to the clipboard.'
      window.setTimeout(function () { button.textContent = 'Copy' }, 1600)
    }, function () {
      if (status) status.textContent = 'Clipboard access was unavailable; copy the command manually.'
    })
  })
})
