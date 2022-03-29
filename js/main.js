// DOM functions
function display(img_data, w, h) {
  // Put it on a canvas
  let canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  canvas.getContext("2d").putImageData(img_data, 0, 0)
  // Put the canvas on the screen
  $("#artbox").html(`<img src="${canvas.toDataURL()}">`)
  // Scroll to the art
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

const upload = () => new Promise(res => {
  let input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = e => {
    let reader = new FileReader()
    reader.onload = e => {
      let img = document.createElement('img')
      img.onload = () => {
        let ctx = document.createElement("canvas").getContext("2d")
        ctx.canvas.width = img.width
        ctx.canvas.height = img.height
        ctx.drawImage(img, 0, 0, img.width, img.height)
        res(ctx.getImageData(0, 0, img.width, img.height))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(e.target.files[0])
  }
  input.click()
})

// Worker stuff
var worker = new Worker('js/process.js')

worker.addEventListener('message', function(e) {
  let [task, ...rest] = e.data
  if (task == 'display') display(...rest)
  else if (task == 'upload') upload().then(d => worker.postMessage(['upload-done', d]))
  else if (task == 'progress') M.toast({html: Math.round(rest[0] * 100) + '% done', classes: 'green'})
}, false)

worker.addEventListener('error', function (e) {
  console.error('ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message)
}, false)

// User interactions
// TODO: Improve this mess
$("textarea.code").each((i, v) => {
  if (v.value.split('\n').length < 2) v.value += "\n\n"
  let cm = CodeMirror.fromTextArea(v, {
    mode: "text/javascript",
    tabSize: 2,
    theme: "seti",
    readOnly: v.id != "editor"
  });
  cm.display.wrapper.className += " " + v.className
  $("<button></button>").css({
    "position": "absolute",
    "bottom": "0.5em",
    "right": "0.5em",
    "z-index": "2"
  }).addClass("btn")
    .text(v.id == "editor" ? "Run" : "Try it!")
    .appendTo(cm.display.wrapper)
    .click(() => {
      // Send it to the worker
      worker.postMessage(['run', cm.getValue(), $("#width").val(), $("#height").val(), $("#n_runs").val()])
    })
})