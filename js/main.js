// DOM functions

const get_url = (img_data, w, h) => {
  let canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  canvas.getContext("2d").putImageData(img_data, 0, 0)
  return canvas.toDataURL()
}

function display(fs, w, h) {
  let us = fs.map(f => get_url(f, w, h))
  function scroll() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
  }
  if (us.length == 1) {
    $("#artbox").html(`<img src="${us[0]}">`)
    scroll()
  } else {
    gifshot.createGIF({
      gifWidth: w,
      gifHeight: h,
      images: us,
      numFrames: us.length,
      frameDuration: 1 / $('#fps').val(),
      sampleInterval: 1,
      numWorkers: 4
    }, function (obj) {
      if (!obj.error) {
        $("#artbox").html(`<img src="${obj.image}">`)
      } else {
        console.error(obj.error)
      }
    })
    scroll()
  }
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
      worker.postMessage(['run', cm.getValue(), $("#width").val(), $("#height").val(), $("#n_runs").val(), animode ? $('#frames').val() : 1])
    })
})

// The Animation Button
var animode = false
$('.animation.btn').click(e => {
  animode = !animode
  $('.animation').toggle()
})