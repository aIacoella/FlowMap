window.onload = function() {
  var item1 = new GeneralObject(map.ctx, 60, 60, 100, 40);
  var item2 = new GeneralObject(map.ctx, 200, 200, 100, 40);

  var ellipse = new Ellipse(map.ctx, 400, 400, 80, 40);

  var ellipse2 = new Ellipse(map.ctx, 300, 400, 80, 40);
  var ellipse3 = new Ellipse(map.ctx, 400, 600, 80, 40);

  map.addObject(item1);
  map.addObject(item2);
  map.addObject([ellipse, ellipse2, ellipse3]);

  map.draw();
};

class FlowMap {
  constructor(name) {
    this.canvas = document.getElementById(name);
    this.ctx = this.canvas.getContext("2d");
    this.BB = this.canvas.getBoundingClientRect();

    this.offsetX = this.BB.left;
    this.offsetY = this.BB.top;
    this.WIDTH = this.canvas.width;
    this.HEIGHT = this.canvas.height;

    this.eventStatus = 0;
    /*
      0: nothing;
      1: moving;
      2 - 9: resizing;
      10: connection;
    */
    this.startX;
    this.startY;

    this.objects = [];

    this.canvas.onmousedown = mouseDown;
    this.canvas.onmouseup = mouseUp;
    this.canvas.onmousemove = mouseMove;

    this.focusedConn = undefined;

    this.grid = 20;
    this.focusedObj = undefined;
    this.hoveredObj = undefined;
  }

  draw() {
    this.clear();
    for (let i = 0; i < this.objects.length; i++) {
      let item = this.objects[i];
      item === this.focusedObj ? item.draw(true) : item.draw(false);
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
  }

  drawBackground() {
    this.ctx.beginPath();
    this.ctx.fillStyle = "black";
    for (let i = this.grid; i < this.WIDTH - this.grid; i += this.grid) {
      for (let f = this.grid; f < this.HEIGHT - this.grid; f += this.grid) {
        this.ctx.fillRect(i, f, 1, 1);
      }
    }
    this.ctx.fill();
    this.ctx.closePath();
  }

  addObject(obj) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        this.objects.push(obj[i]);
      }
    } else {
      this.objects.push(obj);
    }
  }

  isHovering(mx, my) {
    if (this.hoveredObj !== undefined && !this.hoveredObj.isClicking(mx, my)) {
      this.hoveredObj.dismissHovering();
      this.hoveredObj = undefined;
    } else {
      for (let i = 0; i < this.objects.length; i++) {
        let item = this.objects[i];
        if (item instanceof Connection) break;
        if (item.isClicking(mx, my)) {
          if (this.hoveredObj !== item) {
            if (this.hoveredObj !== undefined)
              this.hoveredObj.dismissHovering();
            this.hoveredObj = item;
            item.onHover();
            return item;
          }
        }
      }
    }
    return null;
  }
}

const map = new FlowMap("flowMap");

//-------------LISTNERS-------------

function mouseDown(e) {
  e.preventDefault();
  e.stopPropagation();

  const mx = parseInt(e.clientX - map.offsetX);
  const my = parseInt(e.clientY - map.offsetY);

  map.eventStatus = 0;

  //-----------RESIZING-----------------
  let isRes = -1;
  if (map.focusedObj !== undefined && map.focusedObj instanceof GeneralObject) {
    isRes = map.focusedObj.isResizing(mx, my);
  }
  if (isRes != -1) {
    map.eventStatus = isRes + 2; //---------END-RESIZING---------------
  } else if (
    map.focusedObj !== undefined &&
    map.focusedObj instanceof GeneralObject &&
    map.focusedObj.isConnecting(mx, my)
  ) {
    //---------CONNECTING-----------------
    map.eventStatus = 10;
    var line = new Connection(
      map.ctx,
      map.focusedObj.x,
      map.focusedObj.y,
      mx,
      my
    );
    map.focusedObj.addConnection(line, true);
    map.focusedConn = line;
  } else {
    //--------END-CONNECTING--------------
    let focused = false;
    for (let i = 0; i < map.objects.length; i++) {
      let item = map.objects[i];
      if (item.isClicking(mx, my)) {
        // if yes, set that rects isDragging=true
        map.eventStatus = 1;
        //item.isDragging = true;
        map.focusedObj = item;
        focused = true;
        map.draw();
      }
    }
    if (!focused) {
      map.focusedObj = undefined;
      map.draw();
    }
  }

  map.startX = mx;
  map.startY = my;
}

function mouseUp(e) {
  e.preventDefault();
  e.stopPropagation();

  if (map.eventStatus === 10) {
    if (map.focusedConn.possibleConnection !== undefined) {
      map.focusedConn.connect();
    }
    if (map.hoveredObj !== undefined) {
      map.hoveredObj.dismissHovering();
    }
    map.focusedConn.possibleConnection = undefined;
    map.focusedConn = undefined;

    map.draw();
  }

  map.eventStatus = 0;
}

function mouseMove(e) {
  e.preventDefault();
  e.stopPropagation();

  let mx = parseInt(e.clientX - map.offsetX);
  let my = parseInt(e.clientY - map.offsetY);

  if (map.eventStatus === 0) {
    document.body.style.cursor = "default";

    if (
      map.focusedObj !== undefined &&
      map.focusedObj instanceof GeneralObject
    ) {
      let resizeResult = map.focusedObj.isResizing(mx, my);
      if (resizeResult !== -1) {
        cursors = ["n-resize", "e-resize", "s-resize", "w-resize"];
        document.body.style.cursor = cursors[resizeResult];
      }
    }
  } else if (map.eventStatus === 1) {
    document.body.style.cursor = "move";

    let dx = mx - map.startX;
    let dy = my - map.startY;

    if (map.focusedObj instanceof Connection) {
      map.focusedObj.move(dx, dy);
    } else if (map.focusedObj instanceof GeneralObject) {
      map.focusedObj.move(dx, dy);
    }
  } else if (map.eventStatus >= 2 && map.eventStatus <= 9) {
    let dx = mx - map.startX;
    let dy = my - map.startY;

    let displacement = [0, 0];

    if (map.focusedObj instanceof GeneralObject) {
      displacement = map.focusedObj.resize(dx, dy);
    }

    map.startX += displacement[0];
    map.startY += displacement[1];
  } else if (map.eventStatus === 10) {
    let dx = mx - map.startX;
    let dy = my - map.startY;

    map.focusedConn.move(dx, dy, mx, my);
  }
}

class GeneralObject {
  constructor(ctx, x, y, width, height) {
    this.ctx = ctx;
    this.xPos = x;
    this.yPos = y;
    this.width = width;
    this.height = height;

    this.hW = this.width / 2;
    this.hH = this.height / 2;

    this.borderColor = "red";
    this.selectMargin = 4;
    this.selectSquare = 8;

    this.fontSize = 12;
    this.text = "First words";

    this.snippetsMargin = 14;

    this.connections = [];
    this.connectionIcon = new Image();
    this.connectionIcon.src = "img/connicon.svg";

    this.hovered = false;
  }
  set x(x) {
    if (x == 0) return;
    let dx = x - this.xPos;
    this.xPos = x;
    for (let i = 0; i < this.connections.length; i++)
      if (this == this.connections[i].connectionFrom)
        this.connections[i].x1 += dx;
      else this.connections[i].x2 += dx;
  }
  get x() {
    return this.xPos;
  }

  set y(y) {
    if (y == 0) return;
    let dy = y - this.yPos;
    this.yPos = y;
    for (let i = 0; i < this.connections.length; i++)
      if (this == this.connections[i].connectionFrom)
        this.connections[i].y1 += dy;
      else this.connections[i].y2 += dy;
  }
  get y() {
    return this.yPos;
  }

  addWidth(dw) {
    if (this.width == 10 && dw < 0) {
      return -1;
    }
    this.width += dw;
    if (this.width < 10) {
      this.width = 10;
      this.hW = this.width / 2;
      return 1;
    }
    this.hW = this.width / 2;
    return 0;
  }

  addHeight(dh) {
    if (this.height == 10 && dh < 0) {
      return -1;
    }
    this.height += dh;
    if (this.height < 10) {
      this.height = 10;
      this.hH = this.height / 2;
      return 1;
    }
    this.hH = this.height / 2;
    return 0;
  }

  move(dx, dy) {
    let newX = map.focusedObj.x + dx;
    let newY = map.focusedObj.y + dy;

    newX = Math.round(newX / map.grid) * map.grid;
    newY = Math.round(newY / map.grid) * map.grid;

    map.focusedObj.x = newX;
    map.focusedObj.y = newY;

    // redraw the scene with the new rect positions
    map.draw();

    // reset the starting mouse position for the next mousemove
    map.startX = newX;
    map.startY = newY;
  }

  resize(dx, dy) {
    let displacement = [0, 0];

    if (map.eventStatus === 3) {
      displacement[0] = this.horrizzontalResize(dx, false);
    } else if (map.eventStatus === 5) {
      displacement[0] = this.horrizzontalResize(dx, true);
    } else if (map.eventStatus === 2) {
      displacement[1] = this.verticalResize(dy, true);
    } else if (map.eventStatus === 4) {
      displacement[1] = this.verticalResize(dy, false);
    }

    if (displacement[0] !== 0 || displacement[1] !== 0) map.draw();

    return displacement;
  }

  horrizzontalResize(dx, isLeft) {
    let dxGridded = Math.round(dx / map.grid) * map.grid;
    let result = this.addWidth(isLeft ? dxGridded * -1 : dxGridded);

    if (result === 0) {
      this.x += dxGridded / 2;
      return dxGridded;
    } else if (result === -1) {
      return 0;
    } else {
      let displ = isLeft ? map.grid / 2 : -map.grid / 2;
      this.x += displ;
      return displ;
    }
  }

  verticalResize(dy, isUp) {
    let dyGridded = Math.round(dy / map.grid) * map.grid;
    let result = this.addHeight(isUp ? dyGridded * -1 : dyGridded);

    if (result === 0) {
      this.y += dyGridded / 2;
      return dyGridded;
    } else if (result === -1) {
      return 0;
    } else {
      let displ = isUp ? map.grid / 2 : -map.grid / 2;
      this.y += displ;
      return displ;
    }
  }

  draw(selected) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.x - this.hW, this.y - this.hH);
    this.ctx.lineTo(this.x + this.hW, this.y - this.hH);
    this.ctx.lineTo(this.x + this.hW, this.y + this.hH);
    this.ctx.lineTo(this.x - this.hW, this.y + this.hH);
    this.ctx.lineTo(this.x - this.hW, this.y - this.hH);
    this.ctx.strokeStyle = this.borderColor;
    this.ctx.stroke();
    this.ctx.closePath();

    this.write();

    selected ? this.onSelect() : null;

    if (this.hovered) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = "orange";
      this.ctx.rect(
        this.x - this.hW - this.selectMargin,
        this.y - this.hH - this.selectMargin,
        this.width + this.selectMargin * 2,
        this.height + this.selectMargin * 2
      );
      this.ctx.stroke();
      this.ctx.closePath();
    }
  }

  addConnection(line, isFrom) {
    if (isFrom) line.connectionFrom = this;
    else line.connectionTo = this;
    this.connections.push(line);
    map.addObject(line);
  }

  drawConnectionSnippet() {
    let imgX = this.x - this.connectionIcon.width / 2;
    let imgY = this.y + this.hH + this.snippetsMargin;
    this.ctx.drawImage(this.connectionIcon, imgX, imgY);
  }

  isConnecting(x, y) {
    return (
      x > this.x - this.connectionIcon.width / 2 &&
      x < this.x + this.connectionIcon.width / 2 &&
      y > this.y + this.hH + this.snippetsMargin &&
      y < this.y + this.hH + this.snippetsMargin + this.connectionIcon.height
    );
  }

  write() {
    this.ctx.font = this.fontSize + "px Verdana";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "center";
    this.ctx.fillText(this.text, this.x, this.y + this.fontSize / 2);
  }

  isClicking(x, y) {
    return (
      x > this.x - this.hW &&
      x < this.x + this.hW &&
      y > this.y - this.hH &&
      y < this.y + this.hH
    );
  }

  isResizing(x, y) {
    let top = [
      this.x - this.selectSquare / 2,
      this.x + this.selectSquare / 2,
      this.y - this.hH - this.selectMargin - this.selectSquare / 2,
      this.y - this.hH - this.selectMargin + this.selectSquare / 2
    ];

    let right = [
      this.x + this.hW + this.selectMargin - this.selectSquare / 2,
      this.x + this.hW + this.selectMargin + this.selectSquare / 2,
      this.y - this.selectSquare / 2,
      this.y + this.selectSquare / 2
    ];

    let left = [
      this.x - this.hW - this.selectMargin - this.selectSquare / 2,
      this.x - this.hW - this.selectMargin + this.selectSquare / 2,
      this.y - this.selectSquare / 2,
      this.y + this.selectSquare / 2
    ];

    let bottom = [
      this.x - this.selectSquare / 2,
      this.x + this.selectSquare / 2,
      this.y + this.hH + this.selectMargin - this.selectSquare / 2,
      this.y + this.hH + this.selectMargin + this.selectSquare / 2
    ];

    let squares = [top, right, bottom, left];

    for (let i = 0; i < squares.length; i++) {
      if (
        x > squares[i][0] &&
        x < squares[i][1] &&
        y > squares[i][2] &&
        y < squares[i][3]
      )
        return i;
    }
    return -1;
  }

  onSelect() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = "gray";
    this.ctx.rect(
      this.x - this.hW - this.selectMargin,
      this.y - this.hH - this.selectMargin,
      this.width + this.selectMargin * 2,
      this.height + this.selectMargin * 2
    );
    this.ctx.stroke();
    this.ctx.closePath();

    this.drawSelectionSquares();
    this.drawConnectionSnippet();
  }

  drawSelectionSquares() {
    this.ctx.beginPath();
    this.ctx.clearRect(
      this.x - this.selectSquare / 2,
      this.y - this.hH - this.selectMargin - this.selectSquare / 2,
      this.selectSquare,
      this.selectSquare
    );
    this.ctx.rect(
      this.x - this.selectSquare / 2,
      this.y - this.hH - this.selectMargin - this.selectSquare / 2,
      this.selectSquare,
      this.selectSquare
    );

    this.ctx.clearRect(
      this.x + this.hW + this.selectMargin - this.selectSquare / 2,
      this.y - this.selectSquare / 2,
      this.selectSquare,
      this.selectSquare
    );
    this.ctx.rect(
      this.x + this.hW + this.selectMargin - this.selectSquare / 2,
      this.y - this.selectSquare / 2,
      this.selectSquare,
      this.selectSquare
    );

    this.ctx.clearRect(
      this.x - this.hW - this.selectMargin - this.selectSquare / 2,
      this.y - this.selectSquare / 2,
      this.selectSquare,
      this.selectSquare
    );
    this.ctx.rect(
      this.x - this.hW - this.selectMargin - this.selectSquare / 2,
      this.y - this.selectSquare / 2,
      this.selectSquare,
      this.selectSquare
    );

    this.ctx.clearRect(
      this.x - this.selectSquare / 2,
      this.y + this.hH + this.selectMargin - this.selectSquare / 2,
      this.selectSquare,
      this.selectSquare
    );
    this.ctx.rect(
      this.x - this.selectSquare / 2,
      this.y + this.hH + this.selectMargin - this.selectSquare / 2,
      this.selectSquare,
      this.selectSquare
    );
    this.ctx.stroke();
    this.ctx.closePath();
  }

  onHover() {
    this.hovered = true;
  }

  dismissHovering() {
    this.hovered = false;
  }
}

class Ellipse extends GeneralObject {
  constructor(ctx, x, y, width, height) {
    super(ctx, x, y, width, height);
  }

  draw(selected) {
    this.ctx.beginPath();
    this.ctx.ellipse(this.x, this.y, this.hW, this.hH, 0, 0, 2 * Math.PI);
    this.ctx.strokeStyle = "green";
    this.ctx.stroke();
    super.write();
    selected ? this.onSelect() : null;
  }
}

class Connection {
  constructor(ctx, x1, y1, x2, y2) {
    this.ctx = ctx;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.selectMargin = 4;
    this.selectSquare = 8;

    this.connectionFrom = undefined;
    this.connectionTo = undefined;

    this.possibleConnection = undefined;

    this.nodeFocus = "P2";
    this.updateSlope();
  }

  move(dx, dy, mx, my) {
    if (this.nodeFocus === "P1") {
      let newX = this.x1 + dx;
      let newY = this.y1 + dy;

      newX = Math.round(newX / map.grid) * map.grid;
      newY = Math.round(newY / map.grid) * map.grid;

      this.x1 = newX;
      this.y1 = newY;

      map.startX = newX;
      map.startY = newY;
    } else if (this.nodeFocus === "P2") {
      let newX = this.x2 + dx;
      let newY = this.y2 + dy;

      newX = Math.round(newX / map.grid) * map.grid;
      newY = Math.round(newY / map.grid) * map.grid;

      this.x2 = newX;
      this.y2 = newY;

      let item = map.isHovering(mx, my);
      if (item !== null && this.connectionTo !== item) {
        this.possibleConnection = item;
      }

      map.startX = newX;
      map.startY = newY;
    }
    /*else if (this.nodeFocus === "DRAG") {
      let newX1 = this.x1 + dx;
      let newY1 = this.y1 + dy;

      let newX2 = this.x2 + dx;
      let newY2 = this.y2 + dy;

      newX1 = Math.round(newX1 / map.grid) * map.grid;
      newY1 = Math.round(newY1 / map.grid) * map.grid;

      newX2 = Math.round(newX2 / map.grid) * map.grid;
      newY2 = Math.round(newY2 / map.grid) * map.grid;

      this.x1 = newX1;
      this.y1 = newY1;

      this.x2 = newX2;
      this.y2 = newY2;

      map.startX += Math.round(dx / map.grid) * map.grid;
      map.startY += Math.round(dy / map.grid) * map.grid;
    }*/

    map.draw();

    this.updateSlope();
  }

  connect() {
    this.possibleConnection.addConnection(this, false);
  }

  updateSlope() {
    if (this.x2 - this.x1 !== 0) {
      this.m = ((this.y1 - this.y2) / (this.x1 - this.x2)) * -1;
    } else {
      this.m = undefined;
      if (this.y1 < this.y2) this.verticalStack = 1;
      else this.verticalStack = -1;
    }
  }

  draw(selected) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.x1, this.y1);
    this.ctx.lineTo(this.x2, this.y2);
    if (!this.hovered) this.ctx.strokeStyle = "black";
    else this.ctx.strokeStyle = "red";
    this.ctx.stroke();
    this.ctx.closePath();

    this.ctx.beginPath();
    this.ctx.ellipse(this.x1, this.y1, 5, 5, 0, 0, 2 * Math.PI);
    this.ctx.fillStyle = "red";
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(this.x2, this.y2, 5, 5, 0, 0, 2 * Math.PI);
    this.ctx.fillStyle = "green";
    this.ctx.fill();

    this.ctx.closePath();
    selected ? this.onSelect() : null;
  }

  isClicking(x, y) {
    let radius = 10;
    let occurrence = 10;

    if (this.getDistance([this.x1, this.y1], [x, y]) < radius) {
      this.nodeFocus = "P1";
      return true;
    }
    if (this.getDistance([this.x2, this.y2], [x, y]) < radius) {
      this.nodeFocus = "P2";
      return true;
    }
    /*
    if (this.m === undefined) {
      let distance = this.getDistance([this.x1, this.y1], [this.x2, this.y2]);
      for (let i = 0; i < distance; i += occurrence) {
        let center = [this.x1, this.y1 + i * this.verticalStack];
        if (this.getDistance(center, [x, y]) < radius) {
          this.nodeFocus = "DRAG";
          return true;
        }
      }
    } else {
      let theta = Math.atan(this.m);
      let xDistance = Math.abs(this.x2 - this.x1);
      occurrence = occurrence * Math.cos(theta);
      let sign = this.x1 > this.x2 ? 1 : -1;

      for (let i = 0; i < xDistance; i += occurrence) {
        let centerX = Math.round(this.x1 + i * sign * -1);
        let centerY = Math.round(this.y1 + this.m * i * sign);
        let center = [centerX, centerY];

        if (this.getDistance(center, [x, y]) < radius) {
          this.nodeFocus = "DRAG";
          return true;
        }
      }
    }
    */

    return false;
  }

  onSelect() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = "gray";
    this.ctx.rect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
    this.ctx.stroke();
    this.ctx.closePath();
  }

  onHover() {
    this.hovered = true;
  }

  dismissHovering() {
    this.hovered = false;
  }

  getDistance(p1, p2) {
    return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
  }
}
