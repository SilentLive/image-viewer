(function (window) {
  "use strict";

  var self;

  function ImageViewer(canvasId, imageUrl){
    self = this;

    // canvas
    this.canvas = document.getElementById(canvasId);
    this.context = this.canvas.getContext("2d");

    // dirty state
    this.dirty = true;

    // image scale
    this.scale = 1;
    this.scaleStep = 0.1;

    // image center (scroll offset)
    this.center = { x: 0, y: 0 };

    // image
    this.image = new Image();
    this.image.addEventListener('load', this._onImageLoad, false);
    this.image.src = imageUrl;

    // buttons
    this.buttons = [];

    // add buttons
    var padding = 10
      , radius = 20
      , x = this.canvas.width - radius - padding
      , y = this.canvas.height - radius - padding;

    var plusButton = new Button(x, y - 50, radius, drawPlusIcon);
    plusButton.onClick = function(){ self.zoomIn(); };
    this.buttons.push(plusButton);

    var minusButton = new Button(x, y, radius, drawMinusIcon);
    minusButton.onClick = function(){ self.zoomOut(); };
    this.buttons.push(minusButton);

    // render loop
    this.FPS = 1000/30;
    this.tickInterval = null;

    this.InputHandler = new InputHandler(this.canvas, this);
  }

  ImageViewer.prototype._onImageLoad = function(){
    // set scale to use as much space inside the canvas as possible
    if(((self.canvas.height / self.image.height) * self.image.width) <= self.canvas.width){
      self.scale = self.canvas.height / self.image.height;
    } else {
      self.scale = self.canvas.width / self.image.width;
    }

    // center at image center
    self.center.x = self.image.width / 2;
    self.center.y = self.image.height / 2;

    // image changed
    self.dirty = true;

    // stop old render loop (if existed)
    if(self.tickInterval) clearInterval(self.tickInterval);

    // start new render loop
    self.tickInterval = setInterval(function(){ self._render(); }, self.FPS);
  };

  ImageViewer.prototype._render = function(){
    // check if dirty
    if(!this.dirty) return;
    this.dirty = false;

    var ctx = this.context;
    // clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // draw image (transformed and scaled)
    ctx.save();
    var translateX = this.canvas.width / 2 - this.center.x * this.scale
      , translateY = this.canvas.height / 2 - this.center.y * this.scale;

    ctx.translate(translateX, translateY);
    ctx.scale(this.scale, this.scale);

    ctx.drawImage(this.image, 0,0);

    ctx.restore();

    // draw buttons
    this.buttons.forEach(function(button){
      button.draw(ctx);
    });
  };

  ImageViewer.prototype.zoomIn = function(){
    this.scale = this.scale * (1 + this.scaleStep);
    this.dirty = true;
  };

  ImageViewer.prototype.zoomOut = function(){
    this.scale = this.scale * (1 - this.scaleStep);
    this.dirty = true;
  };

  function Button(x, y, radius, icon){
    // centre coordinates
    this.x = x;
    this.y = y;

    // radius
    this.radius = radius;

    // transparency
    this.alpha = 0.5;

    // color
    this.color = '#000000';

    // icon drawing function
    // (ctx, x, y, radius, icon, color, alpha)
    this.icon = icon;

    // click action
    this.onClick = function(){ alert('no click action set!'); }
  }

  Button.prototype.isWithinBounds = function(x, y){
    var dx = Math.abs(this.x - x)
      , dy = Math.abs(this.y - y);
    return  dx * dx + dy * dy <= this.radius * this.radius;
  };

  Button.prototype.draw = function(ctx){
    // preserve context
    ctx.save();

    // drawing settings
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle= this.color;
    ctx.lineWidth = 0;

    // draw circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();

    // draw icon
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    this.icon(ctx, this.x, this.y, this.radius);
    ctx.restore();

    // restore context
    ctx.restore();
  };

  function drawMinusIcon(ctx, centerX, centerY, buttonRadius){
    var rectLength = buttonRadius
      , rectThickness = rectLength / 4
      , x = centerX - rectLength / 2
      , y = centerY - rectThickness / 2;

    ctx.fillRect(x, y, rectLength, rectThickness);
  }

  function drawPlusIcon(ctx, centerX, centerY, buttonRadius){
    /*
        11---10
        |     |
    01--12    09--08
    |              |
    02--03    06--07
        |     |
        04---05
    */
    var rectLength = buttonRadius
      , rectThickness = rectLength / 4;

    ctx.beginPath();
    // 1
    ctx.moveTo(centerX - rectLength / 2,
               centerY - rectThickness / 2);
    // 2
    ctx.lineTo(centerX - rectLength / 2,
               centerY + rectThickness / 2);
    // 3
    ctx.lineTo(centerX - rectThickness / 2,
               centerY + rectThickness / 2);
    // 4
    ctx.lineTo(centerX - rectThickness / 2,
               centerY + rectLength / 2);
    // 5
    ctx.lineTo(centerX + rectThickness / 2,
               centerY + rectLength / 2);
    // 6
    ctx.lineTo(centerX + rectThickness / 2,
               centerY + rectThickness / 2);
    // 7
    ctx.lineTo(centerX + rectLength / 2,
               centerY + rectThickness / 2);
    // 8
    ctx.lineTo(centerX + rectLength / 2,
               centerY - rectThickness / 2);
    // 9
    ctx.lineTo(centerX + rectThickness / 2,
               centerY - rectThickness / 2);
    // 10
    ctx.lineTo(centerX + rectThickness / 2,
               centerY - rectLength / 2);
    // 11
    ctx.lineTo(centerX - rectThickness / 2,
               centerY - rectLength / 2);
    // 12
    ctx.lineTo(centerX - rectThickness / 2,
               centerY - rectThickness / 2);

    ctx.closePath();
    ctx.fill();
  }

  function InputHandler(canvas, imageViewer) {
    this.canvas = canvas;
    this.imageViewer = imageViewer;

    // global
    this.leftMouseButtonDown = false;
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);

    // zooming
    this.canvas.addEventListener('DOMMouseScroll', this._onMouseWheel);
    this.canvas.addEventListener('mousewheel', this._onMouseWheel);

    // moving
    this.mouseLastPos = null;
    this.canvas.addEventListener('mousemove', this._onMouseMove);
  }

  InputHandler.prototype._onMouseDown = function(evt){
    if(evt.button === 0){ // left/main button
      // check if a button was clicked
      var rect = self.canvas.getBoundingClientRect()
        , pos = {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
          };
      var clickedButtons = self.buttons.filter(function(button){ return button.isWithinBounds(pos.x, pos.y); });
      // button clicked
      if(clickedButtons.length > 0 ){
        clickedButtons[0].onClick();
      }
      // no button clicked
      else {
        // set flag for image moving
        self.InputHandler.leftMouseButtonDown = true;
      }
    }
  };

  InputHandler.prototype._onMouseUp = function(evt){
    if(evt.button === 0){ // left/main button
      self.InputHandler.leftMouseButtonDown = false;
    }
  };

  InputHandler.prototype._onMouseWheel = function(evt){
    if (!evt) evt = event;
    evt.preventDefault();
    if(evt.detail<0 || evt.wheelDelta>0){ // up -> smaller
      self.zoomOut();
    } else { // down -> larger
      self.zoomIn();
    }
  };

  InputHandler.prototype._onMouseMove = function(evt){
    var lastPos = self.InputHandler.mouseLastPos
      , rect = self.canvas.getBoundingClientRect()
      , newPos = {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
    if(lastPos !== null && self.InputHandler.leftMouseButtonDown){
      var deltaX = newPos.x - lastPos.x
        , deltaY = newPos.y - lastPos.y;

      self.center.x -= deltaX / self.scale;
      self.center.y -= deltaY / self.scale;
      self.dirty = true;
    }
    self.InputHandler.mouseLastPos = newPos;
  };

  window.ImageViewer = ImageViewer;
}(window));
