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
      11: adding attributes;
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

    this.grid = 20;
    this.focusObj = undefined;
    this.focusAtt = undefined;
    this.hoveredObj = undefined;
  }

  set focusedObj(focusedObj) {
    if (focusedObj !== this.focusObj) {
      this.focusObj = focusedObj;
      if (this.focusObj !== undefined) {
        showProprieties();
      } else {
        hideProprieties();
      }
    }
  }

  get focusedObj() {
    return this.focusObj;
  }

  set focusedAttribute(attribute) {
    this.focusAtt = attribute;
  }

  get focusedAttribute() {
    return this.focusAtt;
  }

  draw() {
    this.clear();
    let generalObjects = [];
    let attributes = [];
    for (let i = 0; i < this.allObjects.length; i++) {
      let item = this.allObjects[i];
      if (item instanceof Attribute) {
        attributes.push(item);
        continue;
      }
      if (item instanceof GeneralObject) {
        generalObjects.push(item);
        continue;
      }
      if (item === this.focusedObj) continue;
      item.draw(false);
    }
    for (let i = 0; i < attributes.length; i++) {
      let item = attributes[i];
      if (item === this.focusedAttribute) continue;
      item.draw();
    }
    for (let i = 0; i < generalObjects.length; i++) {
      let item = generalObjects[i];
      if (item === this.focusedObj) continue;
      item.draw(false);
    }
    if (this.focusedAttribute !== undefined) this.focusedAttribute.draw();
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
    map.focusedConn = line; //--------END-CONNECTING--------------
  } else if (
    //---ADDING-ATTRIBUTES---------
    map.focusedObj !== undefined &&
    map.focusedObj instanceof GeneralObject &&
    map.focusedObj.isAddingAttributes(mx, my)
  ) {
    map.eventStatus = 11;
    var attribute = new Attribute(map.ctx, mx, my, map.focusedObj);
    map.addObject(attribute);
    map.focusedObj.addAttribute(attribute);
    map.focusedAttribute = attribute;
    map.draw();
    updateAttributeBlock();
    //---END-ADDING-ATTRIBUTES---------
  } else {
    let focused = false;
    let connections = [];
    map.focusedAttribute = undefined;

    for (let i = 0; i < map.allObjects.length; i++) {
      let item = map.allObjects[i];
      if (item instanceof Connection) {
        connections.push(item);
        continue;
      }
      if (!(item instanceof Attribute) && item.isClicking(mx, my)) {
        map.eventStatus = 1;
        map.focusedObj = item;
        focused = true;
        map.draw();
        openProp();
        break;
      }
      if (item instanceof Attribute && item.isClicking(mx, my)) {
        map.eventStatus = 11;
        map.focusedObj = item.parent;
        map.focusedAttribute = item;
        focused = true;
        map.draw();
        openProp();
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
      closeProp();
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
  } else if (map.eventStatus == 11) {
    let dx = mx - map.startX;
    let dy = my - map.startY;
    map.focusedAttribute.move(dx, dy);
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
    this.textValue = ["First words"];

    this.ctx.font = this.fontSize + "px Verdana";
    this.textSize = Math.round(this.ctx.measureText(this.textValue[0]).width);

    this.snippetsMargin = 14;

    this.connections = [];
    this.connectionIcon = new Image();
    this.connectionIcon.src = "img/connicon.svg";

    this.attributes = [];
    this.attributesIcon = new Image();
    this.attributesIcon.src = "img/attributesicon.svg";

    this.hovered = false;
  }

  set x(x) {
    let dx = x - this.xPos;
    if (dx == 0) return;
    this.xPos = x;
    for (let i = 0; i < this.connections.length; i++)
      if (this == this.connections[i].connectionFrom)
        this.connections[i].x1 += dx;
      else this.connections[i].x2 += dx;
    for (let i = 0; i < this.attributes.length; i++) {
      this.attributes[i].x += dx;
      this.attributes[i].connection.x1 += dx;
    }
  }
  get x() {
    return this.xPos;
  }

  set y(y) {
    let dy = y - this.yPos;
    if (dy == 0) return;
    this.yPos = y;
    for (let i = 0; i < this.connections.length; i++)
      if (this == this.connections[i].connectionFrom)
        this.connections[i].y1 += dy;
      else this.connections[i].y2 += dy;
    for (let i = 0; i < this.attributes.length; i++) {
      this.attributes[i].y += dy;
      this.attributes[i].connection.y1 += dy;
    }
  }
  get y() {
    return this.yPos;
  }
  set text(text) {
    this.textValue = text;
    this.textSize = Math.round(this.ctx.measureText(text[0]).width);
  }

  get text() {
    return this.textValue;
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

  addAttribute(attribute) {
    this.attributes.push(attribute);
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

  drawAttributesSnippet() {
    let imgX = this.x + this.hW + this.snippetsMargin;
    let imgY = this.y - this.attributesIcon.width / 2;
    this.ctx.drawImage(this.attributesIcon, imgX, imgY);
  }

  isConnecting(x, y) {
    return (
      x > this.x - this.connectionIcon.width / 2 &&
      x < this.x + this.connectionIcon.width / 2 &&
      y > this.y + this.hH + this.snippetsMargin &&
      y < this.y + this.hH + this.snippetsMargin + this.connectionIcon.height
    );
  }

  isAddingAttributes(x, y) {
    return (
      x > this.x + this.hW + this.snippetsMargin &&
      x < this.x + this.hW + this.snippetsMargin + this.attributesIcon.width &&
      y > this.y - this.attributesIcon.height / 2 &&
      y < this.y + this.attributesIcon.height / 2
    );
  }

  write() {
    this.ctx.font = this.fontSize + "px Verdana";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "center";
    //this.ctx.fillText(this.text, this.x, this.y + this.fontSize / 2);

    let yOffset = this.y - ((this.text.length - 1) / 2) * this.fontSize;
    for (let i = 0; i < this.text.length; i++) {
      this.ctx.fillText(this.text[i], this.x, yOffset + this.fontSize / 2);
      yOffset += this.fontSize;
    }
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
    this.drawSnippets();
  }

  drawSnippets() {
    this.drawConnectionSnippet();
    this.drawAttributesSnippet();
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

class Romboid extends GeneralObject {
  constructor(ctx, x, y, width, height) {
    super(ctx, x, y, width, height);
  }

  draw(selected) {
    this.ctx.beginPath();
    this.ctx.globalCompositeOperation = "destination-out";
    this.drawShape();
    this.ctx.fill();
    this.ctx.closePath();
    this.ctx.globalCompositeOperation = "source-over";

    this.ctx.beginPath();
    this.drawShape();
    this.ctx.strokeStyle = "#000000";
    this.ctx.stroke();
    this.ctx.closePath();

    super.draw(selected);
  }

  drawShape() {
    this.ctx.moveTo(this.x, this.y - this.hH);
    this.ctx.lineTo(this.x + this.hW, this.y);
    this.ctx.lineTo(this.x, this.y + this.hH);
    this.ctx.lineTo(this.x - this.hW, this.y);
    this.ctx.lineTo(this.x, this.y - this.hH);
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
  isClicking(x, y) {
    let result =
      (x - this.x) ** 2 / this.hW ** 2 + (y - this.y) ** 2 / this.hH ** 2;
    return result < 1;
  }
}

class Attribute extends GeneralObject {
  constructor(ctx, x, y, parent) {
    super(ctx, x, y, 1, 1);
    this.text = ["Attribute " + parent.attributes.length];
    this.parent = parent;

    this.connection = new Connection(
      this.ctx,
      parent.x,
      parent.y,
      this.x,
      this.y
    );
  }

  set x(x) {
    let dx = x - this.xPos;
    if (dx == 0) return;
    this.xPos = x;
    this.connection.x2 += dx;
  }

  get x() {
    return this.xPos;
  }

  set y(y) {
    let dy = y - this.yPos;
    if (dy == 0) return;
    this.yPos = y;
    this.connection.y2 += dy;
  }

  get y() {
    return this.yPos;
  }
  draw() {
    this.connection.draw();
    this.ctx.clearRect(
      this.x - this.textSize / 2 - this.selectMargin,
      this.y - this.fontSize / 2 - this.selectMargin,
      this.textSize + this.selectMargin * 2,
      this.fontSize + this.selectMargin * 2
    );

    if (this === map.focusedAttribute) {
      super.draw(true);
    } else {
      super.draw(false);
    }
  }

  isClicking(x, y) {
    return (
      x > this.x - this.textSize / 2 &&
      x < this.x + this.textSize / 2 &&
      y > this.y - this.fontSize / 2 &&
      y < this.y + this.fontSize / 2
    );
  }

  onSelect() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = "gray";
    this.ctx.rect(
      this.x - this.textSize / 2 - this.selectMargin,
      this.y - this.fontSize / 2 - this.selectMargin,
      this.textSize + this.selectMargin * 2,
      this.fontSize + this.selectMargin * 2
    );
    this.ctx.stroke();
    this.ctx.closePath();
  }

  move(dx, dy) {
    let newX = map.focusedAttribute.x + dx;
    let newY = map.focusedAttribute.y + dy;

    newX = Math.round(newX / map.grid) * map.grid;
    newY = Math.round(newY / map.grid) * map.grid;

    map.focusedAttribute.x = newX;
    map.focusedAttribute.y = newY;

    // redraw the scene with the new rect positions
    map.draw();

    // reset the starting mouse position for the next mousemove
    map.startX = newX;
    map.startY = newY;
  }
}

class Connection {
  constructor(ctx, x1, y1, x2, y2) {
    this.ctx = ctx;
    this.xp1 = x1;
    this.yp1 = y1;
    this.xp2 = x2;
    this.yp2 = y2;

    this.radius = 20;

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

  if (mx < 0 || mx > map.WIDTH || my < 0 || my > map.HEIGHT) return;

  if (e.srcElement.alt === "rectangle") {
    var rectangle = new Rectangle(map.ctx, mx, my, 80, 40);
    map.addObject(rectangle);
  } else if (e.srcElement.alt === "ellipse") {
    var ellipse = new Ellipse(map.ctx, mx, my, 80, 40);
    map.addObject(ellipse);
  } else if (e.srcElement.alt === "romboid") {
    var romboid = new Romboid(map.ctx, mx, my, 80, 40);
    map.addObject(romboid);
  }
  map.draw();
}

function showProprieties() {
  if (map.focusedObj instanceof GeneralObject) {
    let text = "";
    for (i = 0; i < map.focusedObj.text.length - 1; i++) {
      text += map.focusedObj.text[i] + "\n";
    }
    text += map.focusedObj.text[map.focusedObj.text.length - 1];

    document.getElementById("text").value = text;
    document.getElementById("fsSpan").textContent = map.focusedObj.fontSize;
    document.getElementById("fsSlider").value = map.focusedObj.fontSize;

    updateAttributeBlock();
  }

  document.getElementById("proprieties-contnent").style.visibility = "visible";
}

function updateAttributeBlock() {
  let attributeBlock = document.getElementById("attributes-element-block");
  while (attributeBlock.firstChild) {
    attributeBlock.removeChild(attributeBlock.firstChild);
  }
  for (let i = 0; i < map.focusedObj.attributes.length; i++) {
    let attribute = document.createElement("div");

    let accordion = document.createElement("div");
    accordion.className = "accordion";

    let button = document.createElement("IMG");
    button.src = "img/chevron-up.svg";
    let input = document.createElement("INPUT");
    input.className = "attribute-name";
    input.type = "text";
    input.value = map.focusedObj.attributes[i].text;
    input.spellcheck = false;

    accordion.appendChild(button);
    accordion.appendChild(input);

    let panel = document.createElement("div");
    panel.className = "panel";
    panel.appendChild(document.createTextNode("Lorem ipsum..."));

    button.addEventListener("click", function() {
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
        button.src = "img/chevron-up.svg";
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
        button.src = "img/chevron-down.svg";
      }
    });

    input.addEventListener("change", function() {
      map.focusedObj.attributes[i].text = [input.value];
      map.draw();
    });

    attribute.appendChild(accordion);
    attribute.appendChild(panel);

    attributeBlock.appendChild(attribute);
  }
}

function changeText() {
  map.focusedObj.text = document.getElementById("text").value.split("\n");
  map.draw();
}

function changeFontSize() {
  map.focusedObj.fontSize = parseInt(document.getElementById("fsSlider").value);
  document.getElementById("fsSpan").textContent = map.focusedObj.fontSize;
  map.draw();
}

function hideProprieties() {
  document.getElementById("proprieties-contnent").style.visibility = "hidden";
}
