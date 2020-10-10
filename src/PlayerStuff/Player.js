
import PlayerFireArm from "./PlayerFireArm.js";

export default class Player {
  constructor(scene, x, y, cursors) {
    //inicializacion
    this.scene = scene;
    this.sprite = scene.matter.add.sprite(x, y, 'playerIdle', 0);
    this.scene.game.player = this;

    this.mouse = this.scene.input.activePointer;
    this.prevSceneMouse = new Phaser.Math.Vector2(0,0);

    scene.matter.world.on("beforeupdate", this.resetTouching, this);
    this.scene.events.on("update", this.update, this);  //para que el update funcione

    this.crossCounter = 0;

    //variables para el movimiento
    this.leftMultiply = 1;
    this.rightMultiply = 1;

    this.braceVelocity = 0.08;
    this.falseGravity = this.scene.game.config.physics.matter.gravity.y/(this.scene.matter.world.getDelta() * 30);
    this.falseVelocityY = 0;

    //generacion del cuerpo del personaje (cuerpo compuesto de 4 partes: una parte principal, 2 a cada lado y uno por debajo)
    //los 3 cuerpos que rodean al principal son sensores que detectan con que collisiona el personaje
    const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
    const { width: w, height: h } = this.sprite;
    this.mainBody = Bodies.rectangle(0, 6, w * 0.75, h * 0.8, { chamfer: { radius: 5 } });
    this.sensors = {
      bottom: Bodies.rectangle(0, 36, w * 0.6, 8, { isSensor: true }),
      left: Bodies.rectangle(-w * 0.45, 6, 5, h * 0.6, { isSensor: true }),
      right: Bodies.rectangle(w * 0.45, 6, 5, h * 0.6, { isSensor: true })
    };
    const compoundBody = Body.create({
      parts: [this.mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
      frictionAir: 0.02
    });
    this.sprite.setScale(1.5);
    this.sprite
      .setExistingBody(compoundBody)
      .setFixedRotation()
      .setPosition(x, y)
      .setOrigin(0.5, 0.75)     //0.5, 0.55
      .body.collisionFilter.group = -1;

    this.cursors = cursors;
    this.joyStick = this.scene.plugins.get('rexvirtualjoystickplugin').add(this, {
      x: 120,
      y: 420,
      radius: 100,
      base: this.scene.add.circle(0, 0, 100, 0x888888),
      thumb: this.scene.add.circle(0, 0, 50, 0xcccccc),
      // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
      // forceMin: 16,
      // enable: true
    });
    this.joyStickKeys = this.joyStick.createCursorKeys();

    this.earlyPos = new Phaser.Math.Vector2(this.sprite.body.position.x, this.sprite.body.position.y);
    this.advance32X = 0;
    this.advance32Y = 0;

    this.isTouching = { left: false, right: false, ground: false };

    //jet
    this.activatedJet = false;

    this.fireArm = new PlayerFireArm(this.scene, x, y);
    this.fireCounterTap = 0;
    this.fireCounterHold = 0;
    this.weapons = [];
    this.weapons[0] = {name: "MachineGun", fireRate: 4 * this.scene.matter.world.getDelta() , chFrame: 0};
    this.weapons[1] = {name: "BombLauncher", fireRate: 30 * this.scene.matter.world.getDelta() , chFrame: 1};
    this.weaponCounter = 0;

    this.cursors.changeWeapon.on('down', function(event){
      this.fireCounterHold = 0;
      this.weaponCounter = (this.weaponCounter+1)%this.weapons.length;
      this.fireArm.changeCrosshairSpr(this.weapons[this.weaponCounter].chFrame)
      console.log(this.weapons[this.weaponCounter].name);
    }, this);

    //DISPARO
    this.scene.input.on('pointerdown', function(pointer){
      this.fireArm.setFireArmState(2);
      this.fireArm.update();
      if (this.fireCounterTap >= this.weapons[this.weaponCounter].fireRate){
        this.fireCounterTap = 0;
        this.fireArm.fireWeaponProjectile(this.weaponCounter);
      }
      this.fireCounterHold = 0;
      this.crossCounter = 0;
    }, this);

    this.scene.input.on('pointerup', function(pointer){
      this.fireCounterHold = 0;
    }, this);
    //DISPARO

    scene.matterCollision.addOnCollideStart({
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
      callback: this.onSensorCollide,
      context: this
    });
    scene.matterCollision.addOnCollideActive({
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
      callback: this.onSensorCollide,
      context: this
    });

    //var
    this.invulnerable = false;
    this.alive = true;

    /*
    scene.matterCollision.addOnCollideStart({
      objectA: this.sensors.bottom,
      callback: this.soundFall,
      context: this
    });*/

    //FIREARM

    console.log(this);
  }
  soundFall(bodyB){
    /*if (bodyB.isSensor) return;
    var landSound = this.scene.sound.add('land', {volume: this.scene.game.soundVolume});
    landSound.play();*/
  }
  onSensorCollide({ bodyA, bodyB, pair }) {
    if (bodyB.isSensor) return;
    if (bodyA === this.sensors.bottom) {
      this.isTouching.ground = true;
      if(this.activatedJet && this.playerDown()){
          this.sprite.body.frictionAir = 0.01;
          this.sprite.setVelocityY(this.scene.game.jetVelocity * this.scene.matter.world.getDelta());
          this.sprite.setIgnoreGravity(false);
          this.activatedJet = false;
      }
    }
    //if (bodyB.name == "interactableBody") return;     //ejemplo para cuerpo NO chocables
    if (bodyB.label == "Body" && bodyB.parent.gameObject.tile.properties.lethal) return;
    if (bodyA === this.sensors.right) {
      this.isTouching.right = true;
      this.rightMultiply = 0;
      if (pair.separation > 2) { this.sprite.x -= 0.1 }
    }
    if (bodyA === this.sensors.left) {
      this.isTouching.left = true;
      this.leftMultiply = 0;
      if (pair.separation > 2) { this.sprite.x += 0.1 }
    }
  }

  resetTouching() {
    this.isTouching.left = false;
    this.isTouching.right = false;
    this.isTouching.ground = false;
    this.earlyPos.x = this.sprite.body.position.x;
    this.earlyPos.y = this.sprite.body.position.y;
  }

  playerUp(){
    return this.cursors.upJet.isDown || this.joyStickKeys.up.isDown;
  }
  playerRight(){
    return this.cursors.right.isDown || this.joyStickKeys.right.isDown;
  }
  playerLeft(){
    return this.cursors.left.isDown || this.joyStickKeys.left.isDown;
  }
  playerDown(){
    return this.cursors.down.isDown || this.joyStickKeys.down.isDown;
  }
  playerMoveForce(){
    if(this.game.onPc) return 1;
    else return 1;
  }

  update(time, delta) {
    //BAJO CONSTRUCCIÓN
    this.advance32X += (this.sprite.body.position.x - this.earlyPos.x);
    if(this.advance32X >= 32){
      const layersX = Math.floor(this.advance32X/32);
      this.xFrontiers(1, layersX);
      this.advance32X = this.advance32X - 32*layersX;
    }else if (this.advance32X <= -32) {
      const layersX = Math.floor(Math.abs(this.advance32X/32));
      this.xFrontiers(-1, layersX);
      this.advance32X = this.advance32X + 32*layersX;
    }
    this.advance32Y += (this.sprite.body.position.y - this.earlyPos.y);
    if(this.advance32Y >= 32){
      const layersY = Math.floor(this.advance32Y/32);
      this.yFrontiers(1, layersY);
      this.advance32Y = this.advance32Y - 32*layersY;
    }else if (this.advance32Y <= -32) {
      const layersY = Math.floor(Math.abs(this.advance32Y/32));
      this.yFrontiers(-1, layersY);
      this.advance32Y = this.advance32Y + 32*layersY;
    }
    this.earlyPos.x = this.sprite.body.position.x;
    this.earlyPos.y = this.sprite.body.position.y;
    //BAJO CONSTRUCCIÓN

    if (this.scene.game.lives <= 0) { return; } //CAMBIAR ESPERA ACTIVA
    if (this.alive) {
      if (this.playerRight()) {
        if (!(this.isTouching.ground && this.isTouching.right)) {
          this.sprite.setVelocityX(this.scene.game.moveVelocity * delta * this.rightMultiply);
        }
      }
      else if (this.playerLeft()) {
        if (!(this.isTouching.ground && this.isTouching.left)) {
          this.sprite.setVelocityX(-this.scene.game.moveVelocity * delta * this.leftMultiply);
        }
      } /*else if (this.cursors.right.isUp && this.cursors.left.isUp){
    	  this.sprite.setVelocityX(0);
      }*/
      //document.getElementById('info').innerHTML = this.sprite;
      this.playAnimation((this.fireArm.fireArmState>1));

      //CAMBIAR ESPERA ACTIVA
      if (this.sprite.y > 640) {
        this.damaged(new Phaser.Math.Vector2(0, -1), 40);
      }
      this.leftMultiply = 1;
      this.rightMultiply = 1;


      //DISPARAR
      if(this.mouse.isDown){
        this.fireCounterHold += delta;
        if (this.fireCounterHold >= this.weapons[this.weaponCounter].fireRate){
          this.fireCounterHold = 0;
          this.fireCounterTap = 0;
          this.fireArm.fireWeaponProjectile(this.weaponCounter);
        }
      }
      else{
        if(this.crossCounter > 100 * this.scene.matter.world.getDelta() && this.fireArm.fireArmState != 0)
          this.fireArm.setFireArmState(0);
        else
          this.crossCounter += delta;
      }
      this.fireCounterTap += delta;
      //DISPARAR

      //JET
      if(Phaser.Input.Keyboard.JustDown(this.cursors.upJet)){
            if(!this.activatedJet)
              this.sprite.anims.play('jumpUp', false);
            this.sprite.body.frictionAir = 0.06;
            this.activatedJet = true;
            //this.falseVelocityY = -1/this.scene.matter.world.getDelta();
            this.sprite.setIgnoreGravity(true);
      }

      if(this.playerUp()){
        if(this.sprite.body.velocity.y >= this.braceVelocity){
          this.sprite.setVelocityY((this.sprite.body.velocity.y/this.scene.matter.world.getDelta() - this.braceVelocity) * delta);
        }else {
          this.sprite.setVelocityY(-this.scene.game.jetVelocity * delta);
        }
      }
      if(this.playerDown() && this.activatedJet){
        this.sprite.setVelocityY(this.scene.game.jetVelocity * delta);
      }

      //gravedad falsa para el trhust inicial
      if(this.falseVelocityY < 0){
        this.sprite.y += (this.falseVelocityY * delta);
        this.falseVelocityY += (this.falseGravity * delta);
      }
      else
        this.falseVelocityY = 0;
      //JET
    }
  }
  playAnimation(isFireing){
    if(this.activatedJet){
      //this.sprite.anims.play('jumpUp', false);
    }else{
      if(this.playerRight()){
        this.sprite.anims.play('wRight', true);
      }else if(this.playerLeft()){
        this.sprite.anims.play('wRight', true);
      }else{
        this.sprite.anims.play('idle', true);
      }
    }

    if(isFireing){
      this.sprite.setFlipX(this.fireArm.armDir.x < 0);
    }else{
      if(this.playerRight()){
        this.sprite.setFlipX(false);
      }else if(this.playerLeft()){
        this.sprite.setFlipX(true);
      }
    }
  }

  xFrontiers(dir, layers = 1){
    const xBoundry = 7*dir;
    const yBoundry = 7;
    const xNormalized = Math.floor(this.sprite.x/32);
    const yNormalized = Math.floor(this.sprite.y/32);

    for(var i=0; i<layers; i++){
      for(var j=-yBoundry; j<yBoundry+1; j++){
        if(this.scene.tileBodyMatrix[xNormalized + xBoundry + i][yNormalized +j] != null && !this.scene.tileBodyMatrix[xNormalized + xBoundry + i][yNormalized +j].active){
          Phaser.Physics.Matter.Matter.Composite.addBody(this.scene.matter.world.localWorld, this.scene.tileBodyMatrix[xNormalized + xBoundry + i][yNormalized +j].body);
          this.scene.tileBodyMatrix[xNormalized + xBoundry + i][yNormalized +j].active = true;
        }
        if(this.scene.tileBodyMatrix[xNormalized - xBoundry - 2*dir - i][yNormalized +j] != null && this.scene.tileBodyMatrix[xNormalized - xBoundry - 2*dir - i][yNormalized +j].active){
          Phaser.Physics.Matter.Matter.Composite.removeBody(this.scene.matter.world.localWorld, this.scene.tileBodyMatrix[xNormalized - xBoundry - 2*dir - i][yNormalized +j].body);
          this.scene.tileBodyMatrix[xNormalized - xBoundry - 2*dir - i][yNormalized +j].active = false;
        }
      }
    }
  }
  yFrontiers(dir, layers = 1){
    const xBoundry = 7;
    const yBoundry = 7*dir;
    const xNormalized = Math.floor(this.sprite.x/32);
    const yNormalized = Math.floor(this.sprite.y/32);

    for(var i=-xBoundry; i<xBoundry+1; i++){
      for(var j=0; j<layers; j++){
        if(this.scene.tileBodyMatrix[xNormalized + i][yNormalized + yBoundry + j] != null && !this.scene.tileBodyMatrix[xNormalized + i][yNormalized + yBoundry + j].active){
          Phaser.Physics.Matter.Matter.Composite.addBody(this.scene.matter.world.localWorld, this.scene.tileBodyMatrix[xNormalized + i][yNormalized + yBoundry + j].body);
          this.scene.tileBodyMatrix[xNormalized + i][yNormalized + yBoundry + j].active = true;
        }
        if(this.scene.tileBodyMatrix[xNormalized + i][yNormalized - yBoundry - 2*dir - j] != null && this.scene.tileBodyMatrix[xNormalized + i][yNormalized - yBoundry - 2*dir - j].active){
          Phaser.Physics.Matter.Matter.Composite.removeBody(this.scene.matter.world.localWorld, this.scene.tileBodyMatrix[xNormalized + i][yNormalized - yBoundry - 2*dir - j].body);
          this.scene.tileBodyMatrix[xNormalized + i][yNormalized - yBoundry - 2*dir - j].active = false;
        }
      }
    }
  }

  damaged(deathVector, deathSpread) {
    /*if (!this.invulnerable) {
      //var dieSound = this.scene.sound.add('die', {volume: this.scene.game.soundVolume});  SONIDO MUERTE
      //dieSound.play();
      this.sprite.visible = false;
      this.sprite.setVelocityX(0);
      this.deathSpawn(deathVector, deathSpread);
      this.sprite.y = 900;

    }*/
  }
  respawn() {
    /* POR SI QUEREMOS PARPADEO
    this.sprite.setDepth(1);
    this.otherAndroid.sprite.setDepth(0);
    this.sprite.setVelocityY(0);
    this.sprite.setVelocityX(0);
    this.sprite.x = this.otherAndroid.sprite.x;
    this.sprite.y = this.otherAndroid.sprite.y;

    this.invulnerable = true;
    this.sprite.visible = true;
    this.sprite.setActive(true);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.5,
      ease: 'Cubic.easeOut',
      duration: 150,
      repeat: 6,
      yoyo: true
    })
    this.alive = true;
    this.scene.time.addEvent({
      delay: 6 * 150,
      callback: () => (this.invulnerable = false)
    });*/
  }
  deathSpawn(deathVector, deathSpread) {  //por si queremos particulas de muerte
    /*
    if (this.canDeathSpawn) {
      this.canDeathSpawn = false;
      var remainVelocity = 8;
      const dirAngle = deathVector.angle() * (180 / Math.PI);
      var randomAng;
      var randomVec;
      for (var i = 0; i < this.deathStuff.length; i++) {
        var debree = this.scene.matter.add.image(this.sprite.x, this.sprite.y, this.deathStuff[i], 0, { isSensor: true });
        randomAng = Phaser.Math.Between(dirAngle - deathSpread, dirAngle + deathSpread) * (Math.PI / 180);
        randomVec = new Phaser.Math.Vector2(Math.cos(randomAng), Math.sin(randomAng));
        randomVec.normalize();
        randomVec.scale(remainVelocity);
        debree.setVelocity(randomVec.x, randomVec.y);
        //debree.setAngularVelocity(Math.random()/10-0.05);
        this.scene.time.addEvent({
          delay: 3000,
          callback: (destroyDebree),
          args: [debree]
        });
      }
      this.scene.time.addEvent({
        delay: this.scene.game.respawnTime - 50,
        callback: () => (this.canDeathSpawn = true)
      });
    }
    function destroyDebree(debree) { debree.destroy() }
    */
  }

}
