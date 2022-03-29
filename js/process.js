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
const arr = (dims, f) => {
  let [n, ...others] = dims
  return Array.from({length: n}, (_,i) => (
    others.length > 0 ? arr(others, (...p) => f(i, ...p)) : f(i)
  ))
}
var uploading = null
const upload = async () => {
  let data = await new Promise(res => {
    self.postMessage(['upload'])
    uploading = res
  })
  data = data[0]
  return arr([data.height, data.width, 4], (y, x, i) => data.data[(y*data.width*4) + (x*4) + i])
}
// ------------------------------------------------------------------- //

// This is silly hehe
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
async function update_image(code, w, h, n_runs) {
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
  // Progress Tracking
  let loops = n_runs * h * w
  let loop = 0
  let last_post = Date.now()
  // The Mega Loop
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
        loop += 1
        if (Date.now() - last_post > 2000) {
          self.postMessage(['progress', loop / loops])
          last_post = Date.now()
        }
      }
    }
  }
  return [new ImageData(img, w, h), w, h]
}

self.addEventListener('message', function(e) {
  let [task, ...rest] = e.data
  if (task == 'run') update_image(...rest).then(d => self.postMessage(['display', ...d]))
  else if (task == 'upload-done') uploading(rest)
}, false)