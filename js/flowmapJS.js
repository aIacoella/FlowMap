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

    this.clickStateValue = 0;
  }

  set clickState(s) {
    this.clickStateValue = s;
  }

  get clickState() {
    return this.clickStateValue;
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

  deleteGeneralObject(obj) {
    if (this.focusedObj === obj) {
      this.focusedObj = undefined;
      closeProp();
    }
    for (let i = 0; i < obj.attributes.length; i++) {
      this.deleteAttribute(obj.attributes[i]);
    }
    for (let i = 0; i < obj.connections.length; i++) {
      this.deleteConnection(obj.connections[i]);
      i--;
    }
    for (let i = 0; i < map.allObjects.length; i++) {
      if (map.allObjects[i] === obj) {
        this.allObjects.splice(i, 1);
        break;
      }
    }
  }

  deleteAttribute(obj) {
    for (let i = 0; i < this.allObjects.length; i++) {
      if (this.allObjects[i] === obj) {
        this.allObjects.splice(i, 1);
        break;
      }
    }
    if (this.focusedAttribute === obj) this.focusedAttribute = undefined;
  }

  deleteConnection(obj) {
    if (this.focusedObj === obj) {
      this.focusedObj = undefined;
    }
    if (obj.connectionFrom !== undefined) {
      for (let i = 0; i < obj.connectionFrom.connections.length; i++) {
        if (obj.connectionFrom.connections[i] === obj) {
          obj.connectionFrom.connections.splice(i, 1);
          break;
        }
      }
    }
    if (obj.connectionTo !== undefined) {
      for (let i = 0; i < obj.connectionTo.connections.length; i++) {
        if (obj.connectionTo.connections[i] === obj) {
          obj.connectionTo.connections.splice(i, 1);
          break;
        }
      }
    }
    for (let i = 0; i < this.allObjects.length; i++) {
      if (this.allObjects[i] === obj) {
        this.allObjects.splice(i, 1);
        continue;
      }
    }
  }
}

const map = new FlowMap("flowMap");

//-------------LISTNERS-------------

function mouseDown(e) {
  e.preventDefault();
  e.stopPropagation();

  const mx = parseInt(e.clientX - map.offsetX);
  const my = parseInt(e.clientY - map.offsetY);

  if (map.clickState === 1) {
    clearTimeout();
    resetDoubleClick();
    if (doubleClick(mx, my)) {
      return;
    }
  } else {
    map.clickState++;
    setTimeout(resetDoubleClick, 500);
  }

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
    map.focusedObj !== undefined &&
    map.focusedObj instanceof GeneralObject &&
    map.focusedObj.isDeleting(mx, my)
  ) {
    map.deleteGeneralObject(map.focusedObj);
    map.draw();
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
  } else if (
    map.focusedObj !== undefined &&
    map.focusedObj instanceof Connection &&
    map.focusedObj.isDeleting(mx, my)
  ) {
    map.deleteConnection(map.focusedObj);
    map.draw();
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
        map.focusedAttribute = item;
        map.focusedObj = item.parent;
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
          openProp();
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

  if (
    map.eventStatus === 10 &&
    map.focusedConn.isExtremety() &&
    map.focusedConn.hasMoved
  ) {
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

    if (map.focusedObj instanceof GeneralObject) {
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
  } else if (map.eventStatus === 11) {
    let dx = mx - map.startX;
    let dy = my - map.startY;
    map.focusedAttribute.move(dx, dy);
  } else if (map.eventStatus === 12) {
    let dx = mx - map.startX;
    let dy = my - map.startY;

    map.focusedObj.move(dx, dy);
  }
}

function doubleClick(mx, my) {
  if (map.focusedObj instanceof Connection) {
    if (map.focusedObj.isClicking(mx, my)) {
      console.log("double click on connection");
      map.focusedObj.addNode({ x: mx, y: my });
      map.focusedConn = map.focusedObj;
      map.eventStatus = 10;
      map.draw();
      return true;
    }
  }

  return false;
}

function resetDoubleClick() {
  map.clickState = 0;
}

//-------------OBJECTS-------------

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

    this.fontSizeValue = 12;
    this.textValue = ["Attributo 0"];

    this.ctx.font = this.fontSize + "px Verdana";
    this.textSize = Math.round(this.ctx.measureText(this.textValue[0]).width);

    this.snippetsMargin = 20;

    this.connections = [];
    this.connectionIcon = new Image();
    this.connectionIcon.src = "img/connicon.svg";

    this.attributes = [];
    this.attributesIcon = new Image();
    this.attributesIcon.src = "img/attributesicon.svg";

    this.deleteIcon = new Image();
    this.deleteIcon.src = "img/deleteComponentIcon.svg";

    this.hovered = false;
  }

  set x(x) {
    let dx = x - this.xPos;
    if (dx == 0) return;
    this.xPos = x;
    for (let i = 0; i < this.connections.length; i++)
      if (this == this.connections[i].connectionFrom)
        this.connections[i].getPI().x += dx;
      else this.connections[i].getPF().x += dx;
    for (let i = 0; i < this.attributes.length; i++) {
      this.attributes[i].x += dx;
      this.attributes[i].connection.getPI().x += dx;
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
        this.connections[i].getPI().y += dy;
      else this.connections[i].getPF().y += dy;
    for (let i = 0; i < this.attributes.length; i++) {
      this.attributes[i].y += dy;
      this.attributes[i].connection.getPI().y += dy;
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

  set fontSize(fs) {
    this.fontSizeValue = fs;
    this.ctx.font = this.fontSize + "px Verdana";
    this.textSize = Math.round(this.ctx.measureText(text[0]).width);
  }

  get fontSize() {
    return this.fontSizeValue;
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
    let imgY =
      this.y + this.hH + this.snippetsMargin - this.connectionIcon.height / 2;
    this.ctx.drawImage(this.connectionIcon, imgX, imgY);
  }

  drawAttributesSnippet() {
    let imgX =
      this.x + this.hW + this.snippetsMargin - this.attributesIcon.width / 2;
    let imgY = this.y - this.attributesIcon.width / 2;
    this.ctx.drawImage(this.attributesIcon, imgX, imgY);
  }

  drawDeleteSnippet() {
    let imgX = this.x - this.deleteIcon.width / 2;
    let imgY =
      this.y - this.hH - this.snippetsMargin - this.deleteIcon.height / 2;
    this.ctx.drawImage(this.deleteIcon, imgX, imgY);
  }

  isConnecting(x, y) {
    return (
      x > this.x - this.connectionIcon.width / 2 &&
      x < this.x + this.connectionIcon.width / 2 &&
      y >
        this.y +
          this.hH +
          this.snippetsMargin -
          this.connectionIcon.height / 2 &&
      y <
        this.y + this.hH + this.snippetsMargin + this.connectionIcon.height / 2
    );
  }

  isAddingAttributes(x, y) {
    return (
      x >
        this.x +
          this.hW +
          this.snippetsMargin -
          this.attributesIcon.width / 2 &&
      x <
        this.x +
          this.hW +
          this.snippetsMargin +
          this.attributesIcon.width / 2 &&
      y > this.y - this.attributesIcon.height / 2 &&
      y < this.y + this.attributesIcon.height / 2
    );
  }

  isDeleting(x, y) {
    let imgX = this.x;
    let imgY = this.y - this.hH - this.snippetsMargin;
    let distance = Math.sqrt((x - imgX) ** 2 + (y - imgY) ** 2);
    return distance < this.deleteIcon.height / 2;
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
    this.drawDeleteSnippet();
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

    this.connection = new Connection(
      this.ctx,
      parent.x,
      parent.y,
      this.x,
      this.y
    );

    this.connection.lineColor = "#111111";

    this.text = ["Attribute " + parent.attributes.length];
    this.parent = parent;

    this.anchorValue = 5;
    this.anchorMargin = 10;

    this.circleType = 0;
  }

  set x(x) {
    let dx = x - this.xPos;
    if (dx == 0) return;
    this.xPos = x;
    this.connection.getPF().x += dx;
  }

  get x() {
    return this.xPos;
  }

  set y(y) {
    let dy = y - this.yPos;
    if (dy == 0) return;
    this.yPos = y;
    this.connection.getPF().y += dy;
  }

  get y() {
    return this.yPos;
  }

  set anchor(a) {
    this.anchorValue = a;
    this.updateSnapPoint();
  }

  get anchor() {
    return this.anchorValue;
  }

  set text(text) {
    this.textValue = text;
    this.textSize = Math.round(this.ctx.measureText(this.text[0]).width);
    this.updateSnapPoint();
  }

  get text() {
    return this.textValue;
  }

  set fontSize(fs) {
    this.fontSizeValue = fs;
    this.ctx.font = this.fontSize + "px Verdana";
    this.textSize = Math.round(this.ctx.measureText(this.text[0]).width);
    this.updateSnapPoint();
  }

  get fontSize() {
    return this.fontSizeValue;
  }

  updateSnapPoint() {
    let anchorPoint = this.getAnchorPoint();
    this.connection.getPF().x = anchorPoint.x;
    this.connection.getPF().y = anchorPoint.y;
  }

  getAnchorPoint() {
    if (this.anchorValue === 1)
      return {
        x: this.x - this.anchorMargin - this.textSize / 2,
        y: this.y - this.fontSize / 2 - this.anchorMargin
      };
    else if (this.anchorValue === 2)
      return {
        x: this.x,
        y: this.y - this.fontSize / 2 - this.anchorMargin
      };
    else if (this.anchorValue === 3)
      return {
        x: this.x + this.anchorMargin + this.textSize / 2,
        y: this.y - this.fontSize / 2 - this.anchorMargin
      };
    else if (this.anchorValue === 4)
      return {
        x: this.x - this.anchorMargin - this.textSize / 2,
        y: this.y
      };
    else if (this.anchorValue === 6)
      return {
        x: this.x + this.anchorMargin + this.textSize / 2,
        y: this.y
      };
    else if (this.anchorValue === 7)
      return {
        x: this.x - this.anchorMargin - this.textSize / 2,
        y: this.y + this.fontSize / 2 + this.anchorMargin
      };
    else if (this.anchorValue === 8)
      return {
        x: this.x,
        y: this.y + this.fontSize / 2 + this.anchorMargin
      };
    else if (this.anchorValue === 9)
      return {
        x: this.x + this.anchorMargin + this.textSize / 2,
        y: this.y + this.fontSize / 2 + this.anchorMargin
      };
    else return { x: this.x, y: this.y };
  }

  draw() {
    this.connection.draw();

    this.ctx.clearRect(
      this.x - this.textSize / 2 - this.selectMargin,
      this.y - this.fontSize / 2 - this.selectMargin,
      this.textSize + this.selectMargin * 2,
      this.fontSize + this.selectMargin * 2
    );

    if (this.anchor != 5) {
      let anchorPoint = this.getAnchorPoint();

      this.ctx.beginPath();
      this.ctx.globalCompositeOperation = "destination-out";
      this.ctx.arc(anchorPoint.x, anchorPoint.y, 5, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.closePath();
      this.ctx.globalCompositeOperation = "source-over";

      this.ctx.beginPath();
      this.ctx.arc(anchorPoint.x, anchorPoint.y, 5, 0, 2 * Math.PI);
      if (this.circleType === 1) this.ctx.fill();
      else this.ctx.stroke();

      this.ctx.closePath();
    }

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
    this.nodes = [{ x: x1, y: y1 }, { x: x2, y: y2 }];

    this.radius = 10;

    this.selectMargin = 4;
    this.selectSquare = 8;

    this.connectionFrom = undefined;
    this.connectionTo = undefined;

    this.possibleConnection = undefined;

    this.dashedSetting = [2, 2];
    this.lineType = 0;
    this.lineColor = "#FF4136";

    this.nodeFocus = this.nodes.length - 1;

    this.hasMoved = true;
    this.firstConnection = true;

    this.deleteIcon = new Image();
    this.deleteIcon.src = "img/deleteComponentIcon.svg";

    this.deleteIconX = undefined;
    this.deleteIconY = undefined;

    this.snippetsMargin = 20;
  }

  addNode(node) {
    this.nodeFocus++;
    this.nodes.splice(this.nodeFocus, 0, node);
  }

  removeNode(node) {
    for (let i = 0; i < this.nodes.length; i++) {
      if (node === this.nodes[i]) {
        this.nodes.splice(i, 1);
        return;
      }
    }
  }

  move(dx, dy, mx, my) {
    let node = this.nodes[this.nodeFocus];

    let newX = node.x + dx;
    let newY = node.y + dy;

    newX = Math.round(newX / map.grid) * map.grid;
    newY = Math.round(newY / map.grid) * map.grid;

    node.x = newX;
    node.y = newY;

    if (this.nodeFocus === 0 || this.nodeFocus === this.nodes.length - 1) {
      let item = map.isHovering(mx, my);
      if (item !== null) {
        this.possibleConnection = item;
      } else {
        this.possibleConnection = undefined;
      }
    }

    map.startX = newX;
    map.startY = newY;

    map.draw();
  }

  //returning [newConnection, oldConnecton]
  connect() {
    if (this.nodeFocus === 0) {
      //connecting from
      let oldConnection = this.connectionFrom;
      this.connectionFrom = this.possibleConnection;
      return {
        newConnection: this.connectionFrom,
        oldConnection: oldConnection
      };
    } else if (this.nodeFocus === this.nodes.length - 1) {
      //connecting to

      let oldConnection = this.connectionTo;
      this.connectionTo = this.possibleConnection;
      if (this.connectionTo !== undefined && this.firstConnection) {
        this.getPF().x = this.connectionTo.x;
        this.getPF().y = this.connectionTo.y;
        this.firstConnection = false;
      }
      return { newConnection: this.connectionTo, oldConnection: oldConnection };
    }
  }

  getSlope(p1, p2) {
    if (p2.x - p1.x !== 0) {
      return { m: ((p1.y - p2.y) / (p1.x - p2.x)) * -1, vs: undefined };
    } else {
      if (p1.y < p2.y) return { m: undefined, vs: 1 };
      else return { m: undefined, vs: -1 };
    }
  }

  draw(selected) {
    this.ctx.beginPath();

    this.ctx.moveTo(this.getPI().x, this.getPI().y);
    for (let i = 1; i < this.nodes.length; i++) {
      this.ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
    }

    this.ctx.strokeStyle = this.lineColor;

    if (this.lineType === 0) {
      this.ctx.setLineDash([]);
    } else {
      this.ctx.setLineDash(this.dashedSetting);
    }

    this.ctx.stroke();
    this.ctx.closePath();
    this.ctx.setLineDash([]);

    if (selected) {
      this.ctx.beginPath();
      for (let i = 0; i < this.nodes.length; i++) {
        this.ctx.beginPath();
        this.ctx.ellipse(
          this.nodes[i].x,
          this.nodes[i].y,
          5,
          5,
          0,
          0,
          2 * Math.PI
        );
        this.ctx.fillStyle = "#001F3F";
        this.ctx.fill();
        this.ctx.closePath();
      }
      this.onSelect();
    }
  }

  isClicking(x, y) {
    let occurrence = 10;

    for (let f = 0; f < this.nodes.length - 1; f++) {
      let p1 = this.nodes[f];
      let p2 = this.nodes[f + 1];
      let slope = this.getSlope(p1, p2);
      let m = slope.m;
      let vs = slope.vs;

      if (m === undefined) {
        let distance = this.getDistance([p1.x, p1.y], [p2.x, p2.y]);
        for (let i = 0; i < distance; i += occurrence) {
          let center = [p1.x, p1.y + i * vs];
          if (this.getDistance(center, [x, y]) < this.radius) {
            this.nodeFocus = f;
            console.log("node focus = " + this.nodeFocus);
            return true;
          }
        }
      } else {
        let theta = Math.atan(m);
        let xDistance = Math.abs(p2.x - p1.x);
        occurrence = occurrence * Math.cos(theta);
        let sign = p1.x > p2.x ? 1 : -1;
        for (let i = 0; i < xDistance; i += occurrence) {
          let centerX = Math.round(p1.x + i * sign * -1);
          let centerY = Math.round(p1.y + m * i * sign);
          let center = [centerX, centerY];

          if (this.getDistance(center, [x, y]) < this.radius) {
            this.nodeFocus = f;
            console.log("node focus = " + this.nodeFocus);
            return true;
          }
        }
      }
    }

    return false;
  }

  isExtremety() {
    return this.nodeFocus === 0 || this.nodeFocus === this.nodes.length - 1;
  }

  isResizing(x, y) {
    for (let i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i];
      if (this.getDistance([node.x, node.y], [x, y]) < this.radius) {
        this.nodeFocus = i;
        return i;
      }
    }

    return -1;
  }

  isDeleting(x, y) {
    if (this.deleteIconX === undefined || this.deleteIconY === undefined)
      return false;
    return (
      this.getDistance([x, y], [this.deleteIconX, this.deleteIconY]) <
      this.deleteIcon.width / 2
    );
  }

  onSelect() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = "gray";
    this.ctx.rect(
      this.nodes[0].x,
      this.nodes[0].y,
      this.nodes[this.nodes.length - 1].x - this.nodes[0].x,
      this.nodes[this.nodes.length - 1].y - this.nodes[0].y
    );
    this.ctx.setLineDash([2, 2]);
    this.ctx.stroke();
    this.ctx.closePath();
    this.ctx.setLineDash([]);

    this.drawDeleteSnippet();
  }

  getPI() {
    return this.nodes[0];
  }

  getPF() {
    return this.nodes[this.nodes.length - 1];
  }

  drawDeleteSnippet() {
    let pi = this.getPI();
    let pf = this.getPF();

    let width = Math.abs(pf.x - pi.x);
    let height = Math.abs(pf.y - pi.y);
    if (width >= height) {
      var imgX = pi.x + (pf.x - pi.x) / 2 - this.deleteIcon.width / 2;
      var imgY =
        Math.min(pi.y, pf.y) - this.snippetsMargin - this.deleteIcon.height / 2;
    } else {
      var imgX =
        Math.max(pi.x, pf.x) + this.snippetsMargin - this.deleteIcon.width / 2;
      var imgY = pi.y + (pf.y - pi.y) / 2 - this.deleteIcon.height / 2;
    }

    this.deleteIconX = imgX + this.deleteIcon.width / 2;
    this.deleteIconY = imgY + this.deleteIcon.height / 2;

    this.ctx.drawImage(this.deleteIcon, imgX, imgY);
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
  let proprietiesContnent = document.getElementById("proprieties-contnent");
  while (proprietiesContnent.firstChild) {
    proprietiesContnent.removeChild(proprietiesContnent.firstChild);
  }
  if (map.focusedObj instanceof GeneralObject) {
    let text = "";
    for (i = 0; i < map.focusedObj.text.length - 1; i++) {
      text += map.focusedObj.text[i] + "\n";
    }
    text += map.focusedObj.text[map.focusedObj.text.length - 1];

    let textDiv = document.createElement("div");
    textDiv.className = "proprieties-element-block";

    textDiv.innerHTML =
      "<label>Text </label>" +
      '<textarea name="text" id="text" rows="3" onchange="changeText()"></textarea>';

    let fontDiv = document.createElement("div");
    fontDiv.className = "proprieties-element-block";

    fontDiv.innerHTML =
      '<label>Font Size <span id="fsSpan"></span></label>' +
      '<input type="range" min="8" max="28" class="slider" id="fsSlider" onchange="changeFontSize()">';

    let attributeDiv = document.createElement("div");
    attributeDiv.className = "proprieties-element-block";
    attributeDiv.id = "attributes-element-block";

    proprietiesContnent.appendChild(textDiv);
    proprietiesContnent.appendChild(fontDiv);
    proprietiesContnent.appendChild(attributeDiv);

    document.getElementById("text").value = text;
    document.getElementById("fsSpan").textContent = map.focusedObj.fontSize;
    document.getElementById("fsSlider").value = map.focusedObj.fontSize;

    updateAttributeBlock();
  } else {
  }

  document.getElementById("proprieties-contnent").style.visibility = "visible";
}

function updateAttributeBlock() {
  let attributeBlock = document.getElementById("attributes-element-block");
  while (attributeBlock.firstChild) {
    attributeBlock.removeChild(attributeBlock.firstChild);
  }
  for (let i = 0; i < map.focusedObj.attributes.length; i++) {
    let attributeObj = map.focusedObj.attributes[i];

    let attribute = document.createElement("div");

    let accordion = document.createElement("div");
    accordion.className = "accordion";

    let button = document.createElement("IMG");
    button.src = "img/chevron-up.svg";
    let input = document.createElement("INPUT");
    input.className = "attribute-name";
    input.type = "text";
    input.value = attributeObj.text;
    input.spellcheck = false;

    accordion.appendChild(button);
    accordion.appendChild(input);

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
      attributeObj.text = [input.value];
      map.draw();
    });

    //Start Panel

    let panel = document.createElement("div");
    panel.className = "panel";

    let fontDiv = document.createElement("div");
    fontDiv.className = "attributePropBlock";

    let fontSizeLabel = document.createElement("label");
    fontSizeLabel.appendChild(document.createTextNode("Font Size"));

    let fontSize = document.createElement("input");
    fontSize.type = "range";
    fontSize.min = 8;
    fontSize.value = 14;
    fontSize.max = 28;
    fontSize.className = "smallSlider";

    fontSize.addEventListener("change", function() {
      attributeObj.fontSize = parseInt(fontSize.value);
      map.draw();
    });

    fontDiv.appendChild(fontSizeLabel);
    fontDiv.appendChild(fontSize);

    panel.appendChild(fontDiv);

    let anchorDiv = document.createElement("div");
    anchorDiv.className = "anchor-type-div";

    let anchorLabel = document.createElement("label");
    anchorLabel.appendChild(document.createTextNode("Anchor"));
    let anchorInput = document.createElement("div");
    anchorInput.className = "anchor-input";

    let anchorSnapList = [];
    for (let a = 1; a <= 9; a++) {
      let anchorSnap = document.createElement("img");
      if (attributeObj.anchor !== a) {
        anchorSnap.src = "img/anchorSnapUN.svg";
        anchorSnap.activated = false;
      } else {
        anchorSnap.src = "img/anchorSnapSE.svg";
        anchorSnap.activated = true;
      }

      anchorSnapList.push(anchorSnap);
      anchorInput.appendChild(anchorSnap);
    }

    for (let a = 1; a <= 9; a++) {
      let anchorSnap = anchorSnapList[a - 1];

      anchorSnap.addEventListener("click", function() {
        for (let f = 0; f < anchorSnapList.length; f++) {
          anchorSnapList[f].src = "img/anchorSnapUN.svg";
          anchorSnapList[f].activated = false;
        }
        anchorSnap.src = "img/anchorSnapSE.svg";
        anchorSnap.activated = true;
        attributeObj.anchor = a;

        map.draw();
      });
    }

    anchorDiv.appendChild(anchorLabel);
    anchorDiv.appendChild(anchorInput);

    let circleTypeLabel = document.createElement("label");
    circleTypeLabel.appendChild(document.createTextNode("Circle"));
    circleTypeLabel.style = "text-align: center;";

    let circleType = document.createElement("img");
    circleType.src = "img/circle-stroke.svg";
    circleType.alt = "circleStroke";
    circleType.className = "circle-type";

    circleType.addEventListener("click", function() {
      console.log("changing");
      if (circleType.alt === "circleStroke") {
        circleType.src = "img/circle-filled.svg";
        circleType.alt = "circleFilled";
        attributeObj.circleType = 1;
      } else {
        circleType.src = "img/circle-stroke.svg";
        circleType.alt = "circleStroke";
        attributeObj.circleType = 0;
      }
      map.draw();
    });

    anchorDiv.appendChild(circleTypeLabel);
    anchorDiv.appendChild(circleType);

    panel.appendChild(anchorDiv);

    //END PANEL

    attribute.appendChild(accordion);
    attribute.appendChild(panel);

    attributeBlock.appendChild(attribute);
    if (
      map.focusedAttribute !== undefined &&
      attributeObj === map.focusedAttribute
    ) {
      panel.style.maxHeight = panel.scrollHeight + "px";
      button.src = "img/chevron-down.svg";
    }
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
