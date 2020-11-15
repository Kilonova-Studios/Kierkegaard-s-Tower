import Enemy from "./Enemy.js";
import DropableGroundEnergy from "../Objects/Dropables/DropableGroundEnergy.js"
import Audio from "../Audio.js";
import TileController from "../TileController.js"

//enemigo que hereda de Enemy
export default class ZapperGround extends Enemy {
  constructor(scene, x, y){
    super(scene, x, y, 'zapperGround', 75);
    this.sprite.setScale(2);

    //this.sprite.setBounce(1.01735).setFixedRotation().setFriction(0).setFrictionAir(0).setFrictionStatic(0);
    const { Body, Bodies } = Phaser.Physics.Matter.Matter;
    const body = Bodies.rectangle(0, 0, 30, 40);
    /*this.sensors = {
      left: Bodies.rectangle(-25, 6, 10, 20, { isSensor: true }),
      right: Bodies.rectangle(25 , 6, 10, 20, { isSensor: true }),
      bottom: Bodies.rectangle(0, 60, 10, 10, { isSensor: true })
    };
    const compoundBody = Body.create({
      parts: [body, this.sensors.left, this.sensors.right, this.sensors.bottom]
    });

    this.sprite.setExistingBody(compoundBody).setOrigin(0.52, 0.55).setPosition(x, y).setFixedRotation();*/
    this.sprite.setExistingBody(body).setPosition(x, y).setFixedRotation().setOrigin(0.5,0.75);
    this.scene.bulletInteracBodies[this.currentBodyIndex] = body;
    this.scene.enemyController.enemyBodies[this.currentEnemyIndex] = body;
    this.sprite.body.collisionFilter.group = -3;
    this.sprite.body.restitution = 0.4;

    this.adjustedFriction = this.sprite.body.friction / this.scene.matter.world.getDelta();

    //Variables de IA
    //No Tocar
    this.patrolDir = (Math.round(Math.random()) == 1)?1:-1;
    this.initPos = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
    this.traveledDistance = 0;
    this.playerVector = new Phaser.Math.Vector2(0, 0);
    this.targetDir = false;
    //No Tocar

    //Ajustar estas
    this.points = 20;               //puntos al matar a enemigo
    this.patrolRouteLength = 60*this.scene.matter.world.getDelta();  //al patrullar cuanto se desplaza antes de darse la vuelta
    this.patrolSpeed = 1/this.scene.matter.world.getDelta();        //velocidad al patrullar
    this.energyDrop = 100;                                             //drop de energia
    //Ajustar estas
    //Variables de IA


    //IA
    this.initializeAI(2);
    this.stateOnStart(0, function(){
      if(this.sprite == undefined || this.sprite.body == undefined)return;
      this.sprite.body.friction = 0.1;
      this.sprite.setIgnoreGravity(false);
      this.sprite.anims.play('zapperGroundRun', true);
    });
    this.stateUpdate(0,function(){
      if(this.sprite == undefined || this.sprite.body == undefined)return;

      this.sprite.setVelocityX(this.patrolSpeed * this.patrolDir * delta);
      this.traveledDistance += delta;
      if(this.traveledDistance >= this.patrolRouteLength){
        this.traveledDistance = 0;
        this.patrolDir = -this.patrolDir;
      }
      this.sprite.setFlipX(this.sprite.body.velocity.x<0);
    })

    this.startAI();
    //IA

    //AUDIO
      this.sfx=Audio.play3DenemyInstance(this, 46);
      this.sfxDetect=Audio.play2Dinstance(54);
      this.stateChanged=false;
    //
  }

  update(time, delta){
    super.update(time, delta);
      //AUDIO
        this.sfx.volume=Audio.volume3D(this);
        this.sfxDetect.volume=Audio.volume3D(this);
      //
  }


  damage(dmg, v){
      //AUDIO
          var auxSfx=Audio.play3DinstanceRnd(this,45);
          auxSfx.setDetune(auxSfx.detune+250);
      //
    if(this.currentStateId() == 1){
      //AUDIO
        this.soundChangeState();
      //
      this.goTo( 2);
    }else if(this.currentStateId() != 0)
      super.damage(dmg, v);
  }
  damageLaser(dmg, v){
    //AUDIO
      Audio.load.lasserSufferingLoop.setDetune(50);
    //
    if(this.currentStateId() == 1){
        this.soundChangeState();
      //
      this.goTo(2);
    }else if(this.currentStateId() != 0)
      super.damageLaser(dmg, v);
  }

  enemyDead(vXDmg){
    this.goTo(1);
    if(!this.dead){
      const xPos = this.sprite.x;
      const yPos = this.sprite.y;
      //AUDIO
          Audio.play3DinstanceRnd(this, 57);
          Audio.play3DinstanceRnd(this, 60);
          this.sfx.stop();
          this.sfxDetect.stop();
      //
      let explosion = this.scene.add.sprite(this.sprite.x, this.sprite.y, "enemyExplosion");
      explosion.setDepth(10).setScale(2);
      //al completar su animacion de explsion, dicha instancia se autodestruye
      explosion.on('animationcomplete', function(){
        explosion.destroy();
      });
      //animacion de explosion
      explosion.anims.play('enemyExplosion', true);
      super.enemyDead();
      new DropableGroundEnergy(this.scene, xPos, yPos, Math.sign(vXDmg),  this.energyDrop);
    }
  }

  updatePlayerPosition(dist){
  }
  distanceToPlayer(){
    if(this.sprite.body != undefined)
      return Math.sqrt(Math.pow(this.sprite.x - this.scene.game.player.sprite.x,2) + Math.pow(this.sprite.y - this.scene.game.player.sprite.y,2));
    else
      return 512;    //ARREGLAR ESTO
  }

  //AUDIO
  soundChangeState(){
    if(!this.stateChanged){
      this.sfxDetect=Audio.play3Dinstance(this, 47);
      this.stateChanged=true;
    }
  }
  //
}
