window.onload = function() {
  hideProprieties();
};

class FlowMap {
  constructor(name) {
    this.canvas = document.getElementById(name);
    this.ctx = this.canvas.getContext("2d");
    this.ctx.lineWidth = 2;
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

    this.allObjects = [];
    this.connections = [];
    this.generalObjects = [];

    this.canvas.onmousedown = mouseDown;
    this.canvas.onmouseup = mouseUp;
    this.canvas.onmousemove = mouseMove;

    this.focusedConn = undefined;

    this.grid = 10;
    this.focusObj = undefined;
    this.hoveredObj = undefined;
  }

  set focusedObj(focusedObj) {
    if (focusedObj !== this.focusObj) {
      this.focusObj = focusedObj;
      if (this.focusObj !== undefined) {
        console.log("show");
        showProprieties();
      } else {
        hideProprieties();
      }
    }
  }

  get focusedObj() {
    return this.focusObj;
  }

  draw() {
    this.clear();
    let generalObjects = [];
    for (let i = 0; i < this.allObjects.length; i++) {
      let item = this.allObjects[i];
      if (item instanceof GeneralObject) {
        generalObjects.push(item);
        continue;
      }
      if (item === this.focusedObj) continue;
      item.draw(false);
    }
    for (let i = 0; i < generalObjects.length; i++) {
      let item = generalObjects[i];
      if (item === this.focusedObj) continue;
      item.draw(false);
    }
    if (this.focusedObj !== undefined) this.focusedObj.draw(true);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
  }

  addObject(obj) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        this.allObjects.push(obj[i]);
      }
    } else {
      this.allObjects.push(obj);
    }
  }

  isHovering(mx, my) {
    let overNull =
      this.hoveredObj !== undefined && !this.hoveredObj.isClicking(mx, my);
    if (overNull) {
      this.hoveredObj.hovered = false;
      this.hoveredObj = undefined;
      return null;
    } else {
      for (let i = 0; i < this.allObjects.length; i++) {
        let item = this.allObjects[i];
        if (item instanceof Connection) continue;
        if (item.isClicking(mx, my)) {
          if (this.hoveredObj !== item) {
            if (this.hoveredObj !== undefined) this.hoveredObj.hovered = false;
            this.hoveredObj = item;
            item.hovered = true;
            return item;
          }
        }
      }
    }
    return this.hoveredObj;
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
  if (map.focusedObj !== undefined) {
    isRes = map.focusedObj.isResizing(mx, my);
  }
  if (isRes != -1) {
    if (map.focusedObj instanceof GeneralObject) map.eventStatus = isRes + 2;
    else {
      map.eventStatus = 10;
      map.focusedConn = map.focusedObj;
      map.focusedConn.hasMoved = false;
      /*isRes === 1
        ? (map.focusedConn.nodeFocus = "P1")
        : (map.focusedConn.nodeFocus = "P2");
      map.focusedConn.move(0, 0, mx, my); */
    }
    //---------END-RESIZING---------------
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
    line.connectionFrom = map.focusedObj;
    map.addObject(line);
    map.focusedObj.addConnection(line);
    map.focusedConn = line;
  } else {
    //--------END-CONNECTING--------------
    let focused = false;
    let connections = [];
    for (let i = 0; i < map.allObjects.length; i++) {
      let item = map.allObjects[i];
      if (item instanceof Connection) {
        connections.push(item);
        continue;
      }
      if (item.isClicking(mx, my)) {
        map.eventStatus = 1;
        map.focusedObj = item;
        focused = true;
        map.draw();
        break;
      }
    }
    if (!focused) {
      for (let i = 0; i < connections.length; i++) {
        let item = connections[i];
        if (item.isClicking(mx, my)) {
          map.eventStatus = 1;
          map.focusedObj = item;
          focused = true;
          map.draw();
          break;
        }
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

  if (map.eventStatus === 10 && map.focusedConn.hasMoved) {
    let componentConnection = map.focusedConn.connect();
    //remove old Connection
    if (componentConnection.oldConnection !== undefined) {
      componentConnection.oldConnection.removeConnection(map.focusedConn);
    }
    //add new Connection
    if (componentConnection.newConnection !== undefined) {
      componentConnection.newConnection.addConnection(map.focusedConn);
    }
    if (map.hoveredObj !== undefined) {
      map.hoveredObj.hovered = false;
    }
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

    map.focusedConn.hasMoved = true;

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
    this.write();

    selected ? this.onSelect() : null;

    if (this.hovered) {
      this.onHover();
    }
  }

  onHover() {
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

  addConnection(line, pole) {
    this.connections.push(line);
  }

  removeConnection(line) {
    for (let i = 0; i < this.connections.length; i++) {
      if (line === this.connections[i]) {
        this.connections.splice(i, 1);
        return true;
      }
    }
    return false;
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
}

class Ellipse extends GeneralObject {
  constructor(ctx, x, y, width, height) {
    super(ctx, x, y, width, height);
  }

  draw(selected) {
    this.ctx.beginPath();
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.ellipse(this.x, this.y, this.hW, this.hH, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.closePath();
    this.ctx.globalCompositeOperation = "source-over";

    this.ctx.beginPath();
    this.ctx.ellipse(this.x, this.y, this.hW, this.hH, 0, 0, 2 * Math.PI);
    this.ctx.strokeStyle = "#000000";
    this.ctx.stroke();
    this.ctx.closePath();

    super.draw(selected);
  }

  isClicking(x, y) {
    let result =
      (x - this.x) ** 2 / this.hW ** 2 + (y - this.y) ** 2 / this.hH ** 2;
    return result < 1;
  }
}

class Rectangle extends GeneralObject {
  constructor(ctx, x, y, width, height) {
    super(ctx, x, y, width, height);
  }

  draw(selected) {
    this.ctx.clearRect(
      this.x - this.hW,
      this.y - this.hH,
      this.width,
      this.height
    );

    this.ctx.beginPath();
    this.ctx.moveTo(this.x - this.hW, this.y - this.hH);
    this.ctx.lineTo(this.x + this.hW, this.y - this.hH);
    this.ctx.lineTo(this.x + this.hW, this.y + this.hH);
    this.ctx.lineTo(this.x - this.hW, this.y + this.hH);
    this.ctx.lineTo(this.x - this.hW, this.y - this.hH);
    this.ctx.strokeStyle = "#000000";
    this.ctx.stroke();
    this.ctx.closePath();
    super.draw(selected);
  }
}

class Connection {
  constructor(ctx, x1, y1, x2, y2) {
    this.ctx = ctx;
    this.xp1 = x1;
    this.yp1 = y1;
    this.xp2 = x2;
    this.yp2 = y2;

    this.radius = 10;

    this.selectMargin = 4;
    this.selectSquare = 8;

    this.connectionFrom = undefined;
    this.connectionTo = undefined;

    this.possibleConnection = undefined;

    this.nodeFocus = "P2";
    this.updateSlope();

    this.hasMoved = true;
    this.firstConnection = true;
  }

  set x1(x) {
    this.xp1 = x;
    this.updateSlope();
  }

  set x2(x) {
    this.xp2 = x;
    this.updateSlope();
  }

  set y1(y) {
    this.yp1 = y;
    this.updateSlope();
  }

  set y2(y) {
    this.yp2 = y;
    this.updateSlope();
  }

  get x1() {
    return this.xp1;
  }
  get x2() {
    return this.xp2;
  }
  get y1() {
    return this.yp1;
  }
  get y2() {
    return this.yp2;
  }

  move(dx, dy, mx, my) {
    if (this.nodeFocus === "P1") {
      let newX = this.x1 + dx;
      let newY = this.y1 + dy;

      newX = Math.round(newX / map.grid) * map.grid;
      newY = Math.round(newY / map.grid) * map.grid;

      this.x1 = newX;
      this.y1 = newY;

      let item = map.isHovering(mx, my);
      if (item !== null) {
        this.possibleConnection = item;
      } else {
        this.possibleConnection = undefined;
      }

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
      if (item !== null) {
        this.possibleConnection = item;
      } else {
        this.possibleConnection = undefined;
      }

      map.startX = newX;
      map.startY = newY;
    }

    map.draw();

    this.updateSlope();
  }

  //returning [newConnection, oldConnecton]
  connect() {
    if (this.nodeFocus === "P1") {
      //connecting from
      let oldConnection = this.connectionFrom;
      this.connectionFrom = this.possibleConnection;
      return {
        newConnection: this.connectionFrom,
        oldConnection: oldConnection
      };
    } else {
      //connecting to

      let oldConnection = this.connectionTo;
      this.connectionTo = this.possibleConnection;
      if (this.connectionTo !== undefined && this.firstConnection) {
        this.x2 = this.connectionTo.x;
        this.y2 = this.connectionTo.y;
        this.firstConnection = false;
      }
      return { newConnection: this.connectionTo, oldConnection: oldConnection };
    }
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
    if (!this.hovered) this.ctx.strokeStyle = "#FF4136";
    else this.ctx.strokeStyle = "red";
    this.ctx.stroke();
    this.ctx.closePath();

    if (
      (map.focusedObj !== undefined || map.focusedConn !== undefined) &&
      (map.focusedObj === this || map.focusedConn === this)
    ) {
      this.ctx.beginPath();
      this.ctx.ellipse(this.x1, this.y1, 5, 5, 0, 0, 2 * Math.PI);
      this.ctx.fillStyle = "#001F3F";
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.ellipse(this.x2, this.y2, 5, 5, 0, 0, 2 * Math.PI);
      this.ctx.fillStyle = "#001F3F";
      this.ctx.fill();
    }

    this.ctx.closePath();
    selected ? this.onSelect() : null;
  }

  isClicking(x, y) {
    let occurrence = 10;

    if (this.m === undefined) {
      let distance = this.getDistance([this.x1, this.y1], [this.x2, this.y2]);
      for (let i = 0; i < distance; i += occurrence) {
        let center = [this.x1, this.y1 + i * this.verticalStack];
        if (this.getDistance(center, [x, y]) < this.radius) {
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

        if (this.getDistance(center, [x, y]) < this.radius) {
          this.nodeFocus = "DRAG";
          return true;
        }
      }
    }

    return false;
  }

  isResizing(x, y) {
    if (this.getDistance([this.x1, this.y1], [x, y]) < this.radius) {
      this.nodeFocus = "P1";
      return 1;
    }
    if (this.getDistance([this.x2, this.y2], [x, y]) < this.radius) {
      this.nodeFocus = "P2";
      return 2;
    }

    return -1;
  }

  onSelect() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = "gray";
    this.ctx.rect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
    this.ctx.stroke();
    this.ctx.closePath();
  }

  getDistance(p1, p2) {
    return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
  }
}

//OTHER STUFF

function openNav() {
  document.getElementById("sideAdd").style.width = "200px";
}

function closeNav() {
  document.getElementById("sideAdd").style.width = "0";
}

function openProp() {
  document.getElementById("proprieties-block").style.width = "300px";
  document.getElementById("proprieties-block").style.height = "600px";
}

function closeProp() {
  document.getElementById("proprieties-block").style.width = "0";
  document.getElementById("proprieties-block").style.height = "0";
}

function createComponent(e) {
  e.preventDefault();
  e.stopPropagation();

  let mx = parseInt(e.clientX - map.offsetX);
  let my = parseInt(e.clientY - map.offsetY);

  mx = Math.round(mx / map.grid) * map.grid;
  my = Math.round(my / map.grid) * map.grid;

  console.log(mx);

  if (mx < 0 || mx > map.WIDTH || my < 0 || my > map.HEIGHT) return;

  if (e.srcElement.alt === "rectangle") {
    var rectangle = new Rectangle(map.ctx, mx, my, 80, 40);
    map.addObject(rectangle);
  } else if (e.srcElement.alt === "ellipse") {
    var ellipse = new Ellipse(map.ctx, mx, my, 80, 40);
    map.addObject(ellipse);
  }
  map.draw();
}

function showProprieties() {
  document.getElementById("text").value = map.focusedObj.text;
  document.getElementById("proprieties-contnent").style.visibility = "visible";
}

function changeText() {
  map.focusedObj.text = document.getElementById("text").value;
  console.log(document.getElementById("text").value);
  map.draw();
}

function hideProprieties() {
  document.getElementById("proprieties-contnent").style.visibility = "hidden";
}
