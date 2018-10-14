/*
if (map.focusedObj !== undefined) {
  if (map.focusedObj instanceof GeneralObject) {
    if (map.focusedObj.isConnecting(mx, my)) {
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
      //--------END-CONNECTING--------------
    } else if (map.focusedObj.isDeleting(mx, my)) {
      map.deleteGeneralObject(map.focusedObj);
      map.draw();
    } else if (map.focusedObj.isAddingAttributes(mx, my)) {
      //---ADDING-ATTRIBUTES---------
      map.eventStatus = 11;
      var attribute = new Attribute(map.ctx, mx, my, map.focusedObj);
      map.addObject(attribute);
      map.focusedObj.addAttribute(attribute);
      map.focusedAttribute = attribute;
      map.draw();
      updateAttributeBlock();
      //---END-ADDING-ATTRIBUTES---------
    }
  } else if (map.focusedObj instanceof Connection) {
    if (map.focusedObj.isDeleting(mx, my)) {
      map.deleteConnection(map.focusedObj);
      map.draw();
    }
  }
}
*/
