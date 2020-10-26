import Enemy from "./Enemy.js";
import DropableGroundEnergy from "../Objects/Dropables/DropableGroundEnergy.js"
import EnergyBall from "../Objects/Projectiles/EnemyProjectiles/EnergyBall.js"

//enemigo que hereda de Enemy
export default class ZapperGround extends Enemy {
  constructor(scene, x, y){
    super(scene, x, y, 'dummy', 100);
    this.sprite.setScale(0.4);

    //this.sprite.setBounce(1.01735).setFixedRotation().setFriction(0).setFrictionAir(0).setFrictionStatic(0);
    const { Body, Bodies } = Phaser.Physics.Matter.Matter;
    const body = Bodies.rectangle(0, 6, 30, 75);
    /*this.sensors = {
      left: Bodies.rectangle(-25, 6, 10, 20, { isSensor: true }),
      right: Bodies.rectangle(25 , 6, 10, 20, { isSensor: true }),
      bottom: Bodies.rectangle(0, 60, 10, 10, { isSensor: true })
    };
    const compoundBody = Body.create({
      parts: [body, this.sensors.left, this.sensors.right, this.sensors.bottom]
    });

    this.sprite.setExistingBody(compoundBody).setOrigin(0.52, 0.55).setPosition(x, y).setFixedRotation();*/
    this.sprite.setExistingBody(body).setOrigin(0.52, 0.55).setPosition(x, y).setFixedRotation();
    this.scene.bulletInteracBodies[this.currentBodyIndex] = body;
    this.scene.enemyController.enemyBodies[this.currentEnemyIndex] = body;
    this.sprite.body.collisionFilter.group = -1;
    this.sprite.body.restitution = 0.4;

    this.adjustedFriction = this.sprite.body.friction / this.scene.matter.world.getDelta();

    //Variables de IA
    //No Tocar
    this.patrolDir = (Math.round(Math.random()) == 1)?1:-1;
    this.standByReDistance = 520;
    this.patrolDistance = 480;
    this.initPos = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
    this.traveledDistance = 0;
    //No Tocar

    //Ajustar estas
    this.patrolRouteLength = 100*this.scene.matter.world.getDelta();  //al patrullar cuanto se desplaza antes de darse la vuelta
    this.patrolSpeed = 1/this.scene.matter.world.getDelta();        //velocidad al patrullar
    this.detectDistance = 250;                                        //distancia a la uqe detecta el jugador cuando esta patrullando
    this.detectSpeed = 2.5/this.scene.matter.world.getDelta();        //velocidad al detectarlo
    this.hitDistance = 50;                                            //distancia de la cual se pone a golpear
    this.hitSpeed = 0.5/this.scene.matter.world.getDelta();           //pequeña velocidad mientras está golpeando
    this.hitDamage = 15;                                              //daño al golpear
    //Ajustar estas
    //Variables de IA

    /*this.scene.matterCollision.addOnCollideStart({
      objectA: [this.sensors.left, this.sensors.right],
      callback: this.onSensorCollide,
      context: this
    });
    this.scene.matterCollision.addOnCollideEnd({
      objectA: this.sensors.bottom,
      callback: this.onSensorCollide2,
      context: this
    });*/

    //IA
    this.initializeAI(4);
    this.stateOnStart(0, function(){
      if(this.sprite.body === undefined)return;
      this.sprite.setIgnoreGravity(true);
      this.sprite.setVelocityX(0);
      this.sprite.setVelocityY(0);
      this.sprite.body.friction = 10;
    });
    this.stateOnStart(1, function(){
      if(this.sprite.body === undefined)return;
      this.sprite.body.friction = 0.1;
      this.sprite.setIgnoreGravity(false);
    });
    this.stateUpdate(1, function(time, delta){
      if(this.sprite.body === undefined)return;

      this.sprite.setVelocityX(this.patrolSpeed * this.patrolDir * delta);
      this.traveledDistance += delta;
      if(this.traveledDistance >= this.patrolRouteLength){
        this.traveledDistance = 0;
        this.patrolDir = -this.patrolDir;
      }

    })
    this.stateUpdate(2, function(time, delta){
      if(this.sprite.body === undefined)return;
      this.distanceToCheck = Math.sqrt( Math.pow(this.scene.game.player.sprite.x - this.sprite.x,2) +  Math.pow(this.scene.game.player.sprite.y - this.sprite.y,2));
      if(this.distanceToCheck > this.hitDistance){
        if(Math.abs(this.scene.game.player.sprite.x - this.sprite.x) > this.hitDistance/2)
          this.sprite.setVelocityX(this.detectSpeed * Math.sign(this.scene.game.player.sprite.x - this.sprite.x) * delta);
        //console.log("persuing");
      }else{
        this.goTo(3)
      }
    })
    this.stateOnStart(3, function(){
      if(this.sprite.body === undefined)return;
      //this.sprite.body.collisionFilter.group = -1;
      this.sprite.anims.play('dummy', true)
      this.sprite.once('animationcomplete', function(){
        this.goTo(2);
      },this);
      this.scene.time.addEvent({
        delay: 500,
        callback: () => (this.inflictDamagePlayerArea())
      },this);
    });

    this.stateUpdate(3, function(time, delta){
      if(this.sprite.body === undefined)return;
      this.sprite.setVelocityX(this.hitSpeed * Math.sign(this.scene.game.player.sprite.x - this.sprite.x) * delta);
    });

    this.stateOnEnd(3, function(){
      if(this.sprite.body === undefined)return;
      //this.sprite.body.collisionFilter.group = 0;
    });
    this.startAI();
    //IA
  }

  update(time, delta){
    super.update(time, delta);
  }

  onSensorCollide({ bodyA, bodyB, pair }){
    if (bodyB.isSensor) return;
    if (bodyA === this.sensors.right)
      this.patrolDir = -1;
    else if (bodyA === this.sensors.left)
      this.patrolDir = 1;
    this.traveledDistance = 0;
  }

  onSensorCollide2({ bodyA, bodyB, pair }){
     if (bodyB.isSensor) return;
     if(this.scene.tileBodyMatrix[Math.floor(bodyB.position.x/32) + 2*this.patrolDir][Math.floor(bodyB.position.y/32)] === undefined){
       this.patrolDir = -this.patrolDir;
       this.traveledDistance = 0;
     }
  }

  inflictDamagePlayerArea(position){
    if(this.sprite.body === undefined)return;
    this.scene.graphics.clear();
    this.scene.graphics.fillRect(this.sprite.x-50, this.sprite.y-50, 100, 100);
    if(super.playerHit(this.sprite.x-50, this.sprite.y-50, this.sprite.x+50, this.sprite.y+50))
      this.scene.game.player.playerDamage(this.hitDamage);
  }


  damage(dmg, v){
    if(this.currentStateId() < 2)
      this.goTo( 2);
    super.damage(dmg, v);
  }
  damageLaser(dmg, v){
    if(this.currentStateId() < 2)
      this.goTo(2);
    super.damageLaser(dmg, v);
  }

  enemyDead(vXDmg){
    this.goTo(0);
    if(!this.dead){
      super.enemyDead();
      new EnergyBall(this.scene, this.sprite.x, this.sprite.y, 14, 0.1, 15, new Phaser.Math.Vector2(-1,0), 1000);
      new DropableGroundEnergy(this.scene, this.sprite.x, this.sprite.y, Math.sign(vXDmg),  150);
    }
  }

  updatePlayerPosition(dist){
    switch (this.currentStateId()) {
      case 0:
        if(dist <= this.patrolDistance)
          this.goTo(1);
        if(dist > this.standByReDistance)
          this.goTo(0);
      break;
      case 1:
        if(dist <= this.detectDistance)
          this.goTo(2);
        if(dist > this.standByReDistance)
          this.goTo(0);
      break;
      case 2:
        if(dist > this.standByReDistance)
          this.goTo(0);
      break;
      case 3:
        if(dist > this.standByReDistance)
          this.goTo(0);
      break;
    }
  }
}
