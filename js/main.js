// -------------------------- COLOR METHODS -------------------------- //
const rgb = (r, g, b, a = 255) => [r, g, b, a] // Create an rgba color
const cmy = (c, m, y, k = 0) => [255 - c, 255 - m, 255 - y, 255 - k] // Create a cmyk color
const hsv = (h, s, v, a = 1) => { // Create a hsv color
  var r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6)
  f = h * 6 - i
  p = v * (1 - s)
  q = v * (1 - f * s)
  t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break
    case 1: r = q, g = v, b = p; break
    case 2: r = p, g = v, b = t; break
    case 3: r = p, g = q, b = v; break
    case 4: r = t, g = p, b = v; break
    case 5: r = v, g = p, b = q; break
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), Math.round(a * 255)]
}
const hex = (s) => { // Parse a hex string
  m = s.match(/^#?([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})?$/i)
  if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), parseInt(m[4] || 'ff', 16)]
  m = s.match(/^#?([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])?$/i)
  if (m) return [parseInt(m[1], 16)*0x11, parseInt(m[2], 16)*0x11, parseInt(m[3], 16)*0x11, parseInt(m[4] || 'f', 16)*0x11]
}
const eq = (a, b) => // To compare colors
  a.length === b.length && a.every((v, i) => v === b[i]);
const clamp = (n, low, high) => n > high ? high : (n < low ? low : n)
// ------------------------- Image Loading --------------------------- //
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
        let data = ctx.getImageData(0, 0, img.width, img.height)
        let arr = Array.from({length: data.height}, (_,y) =>
          Array.from({length: data.width}, (_,x) =>
            Array.from({length: 4}, (_,i) =>
              data.data[(y*img.width*4) + (x*4) + i]
        )))
        res(arr)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(e.target.files[0])
  }
  input.click()
})
// ------------------------------------------------------------------- //

// This is silly hehe
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
async function update_image(code) {
  // Get parameters
  let w = $("#width").val()
  let h = $("#height").val()
  let n_runs = $("#n_runs").val()

  // Create the image
  var img = new Uint8ClampedArray(4 * w * h)

  // Initialize access methods
  let calc = (x, y) => 4 * (y * w + x)
  let get = (x, y) => {
    let idx = calc(clamp(x, 0, w), clamp(y, 0, h))
    return [img[idx], img[idx + 1], img[idx + 2], img[idx + 3]]
  }

  // The user's code
  let func = AsyncFunction('x', 'y', 'i', 'w', 'h', 'get', 'rel', code)

  for (let i = 0; i < n_runs; i++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Run the user's function and calculate
        let pix = await func(x, y, i, w, h, get, (dx, dy) => get(x+dx, y+dy))
        // Assign the pixel values
        let idx = calc(x, y)
        img[idx + 0] = pix[0]
        img[idx + 1] = pix[1]
        img[idx + 2] = pix[2]
        img[idx + 3] = pix[3]
      }
    }
  }

  let img_data = new ImageData(img, w, h)
  let canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  canvas.getContext("2d").putImageData(img_data, 0, 0)

  $("#artbox").html(`<img src="${canvas.toDataURL()}">`)
}

function scroll_to_top() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

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
      update_image(cm.getValue())
      scroll_to_top()
    })
})