import React from 'react';
import ReactDOM from 'react-dom';
import frameImgSrc from './screenshot-frame.png';
import frameImgMaskSrc from './screenshot-frame-mask.png';
import Vibrant from 'node-vibrant';

import './styles.css';

const STATE_KEY = 'save.1';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      imgData: '',
      width: 0,
      height: 0,
      scale: 0.4,
      color: '#444444',
    };
    this.previewImgRef = React.createRef();
    this.canvasRef = React.createRef();
    this.frameImgRef = React.createRef();
    this.frameImgMaskRef = React.createRef();
    this.ctx = null;
  }

  handleFile(e) {
    const file = e.currentTarget.files[0]; //sames as here
    const reader = new FileReader();

    reader.onloadend = async () => {
      this.setState({ imgData: reader.result });
      await this.detectColor();
    };

    if (file) {
      reader.readAsDataURL(file); //reads the data as a URL
    }
  }

  handleColorChange(e) {
    this.setState({ color: e.currentTarget.value });
  }

  async detectColor() {
    const color = await this.getPaletteColor();
    this.setState({ color });
  }

  handleScaleChange(v) {
    this.setState(state => ({
      scale: typeof state.scale === 'number' ? state.scale + v : 1 + v,
    }));
  }

  resize = async () => {
    // Size canvas
    const rect = this.canvasRef.current.getBoundingClientRect();

    this.setState({
      width: rect.width * 2,
      height: rect.width * 2,
    });

    await this.drawImage();
  };

  componentDidMount() {
    // initialize the canvas
    this.ctx = this.canvasRef.current.getContext('2d');

    // Load state from localstorage
    try {
      const oldState = JSON.parse(localStorage.getItem(STATE_KEY));
      console.log('Loaded old state', oldState);
      this.setState(oldState);
    } catch (e) {
    }

    window.addEventListener('resize', this.resize);

    // Wait for images to load first
    setTimeout(async () => {
      await this.resize();
      await this.drawImage();
    }, 400);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
  }

  async getPaletteColor() {
    var v = new Vibrant(this.previewImgRef.current, {});
    const palette = await v.getPalette();
    return palette.Vibrant.hex;
  }

  async componentDidUpdate() {
    this.previewImgRef.current.src = this.state.imgData;
    window.localStorage.setItem(STATE_KEY, JSON.stringify(this.state));
    this.drawImage();
  }

  async drawImage() {
    const { width, height, scale, imgData, color } = this.state;

    if (!imgData) {
      return;
    }

    console.log('Draw Image', { width, height, color, scale });

    const ctx = this.ctx;

    ctx.save();

    // Clear the canvas before we start
    ctx.clearRect(0, 0, width, height);

    // Draw the mask rounded rect for the screen
    ctx.drawImage(
      this.frameImgMaskRef.current,
      10,
      10,
      this.state.width - 10 * 2,
      this.state.height - 10 * 2,
    );

    // Draw the uploaded image only over the masked pixels
    ctx.globalCompositeOperation = 'source-in';
    const imgRect = this.previewImgRef.current.getBoundingClientRect();
    const imgAspect = imgRect.width / imgRect.height;
    const scaledWidth = width * scale;
    const scaledHeight = (width * scale) / imgAspect;
    const x = width / 2 - scaledWidth / 2;
    const y = height / 2 - scaledHeight / 2;

    ctx.drawImage(this.previewImgRef.current, x, y, scaledWidth, scaledHeight);

    // Draw the rest of the stuff behind it
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(this.frameImgRef.current, 10, 10, width - 10 * 2, height - 10 * 2);

    // Draw background behind it
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  handleDownload() {
    /// create an "off-screen" anchor tag
    const lnk = document.createElement('a');

    /// the key here is to set the download attribute of the a tag
    lnk.download = 'wallpaper.png';

    /// convert canvas content to data-uri for link. When download
    /// attribute is set the content pointed to by link will be
    /// pushed as "download" in HTML5 capable browsers
    lnk.href = this.canvasRef.current.toDataURL('image/png;base64');

    /// create a "fake" click-event to trigger the download
    if (document.createEvent) {
      const e = document.createEvent('MouseEvents');
      e.initMouseEvent(
        'click',
        true,
        true,
        window,
        0,
        0,
        0,
        0,
        0,
        false,
        false,
        false,
        false,
        0,
        null,
      );

      lnk.dispatchEvent(e);
    } else if (lnk.fireEvent) {
      lnk.fireEvent('onclick');
    }
  }

  render() {
    const { width, height, color, imgData } = this.state;
    return (
      <div className="app">
        <div className="hidden-assets">
          <img src={frameImgSrc} alt="Screenshot Frame" ref={this.frameImgRef}/>
          <img src={frameImgMaskSrc} alt="Screenshot Frame Mask" ref={this.frameImgMaskRef}/>
        </div>
        <div className="col col-left">
          <img ref={this.previewImgRef} alt="Preview" src={imgData}/>
          <input type="file" onChange={this.handleFile.bind(this)}/>
          <input type="color" value={color} onChange={this.handleColorChange.bind(this)}/>
          <button onClick={this.handleScaleChange.bind(this, -0.05)}>-</button>
          <button onClick={this.handleScaleChange.bind(this, 0.05)}>+</button>
          <br/>
        </div>
        <div className="col col-right">
          <canvas
            ref={this.canvasRef}
            width={width}
            height={height}
            style={height > 0 ? { width: '100%', height: `${height / 2}px` } : {}}
          />
          <button onClick={this.handleDownload.bind(this)}>Download</button>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');
ReactDOM.render(<App/>, rootElement);
