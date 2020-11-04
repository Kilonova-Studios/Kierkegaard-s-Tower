import Audio from "../Audio.js";
import FiniteStateMachine from "../FiniteStateMachine.js"
import Dialog from "../Plugins/Dialog.js"

//Clase padre de todos los enemigos
export default class NPC_Droid extends FiniteStateMachine{
  constructor(scene, x, y){
    super();
    //inicializacion
    this.scene = scene;
    this.sprite = scene.add.sprite(x,y,'dummy',0).setScale(2);
    this.sprite.setInteractive();
    this.sprite.playerInteractable = true;
    this.isTalking = false;
    this.enemiesLeft = 0;

    this.weaponToGive = 5;


    this.dialogArray = [];
    this.dialogArray[0] = `Ayuda, Ayuda!!!`;

    this.dialogArray[1] = `Gracias por ayudarme, toma arma`;

    this.dialogArray[2] = `...`;

    this.currentDialog = -1;

    this.sprite.on('pointerdown', function() {
      if(!this.isTalking){
        //AUDIO (número de palabras, escena, personaje);
            Audio.chat(5, scene, 0);
         //
        this.isTalking = true;
        this.scene.dialogManager.setCurrentSpeaker(this);
        this.scene.dialogManager.textBox.start(this.dialogArray[this.currentDialog],10);
        this.scene.dialogManager.showDialogBox();
      }
    }, this);

    //IA
    //this.initializeAI(4);
    this.initializeAI(3);
    this.stateOnStart(0, function(){
    this.currentDialog = 0;
    });
    this.stateOnStart(1, function(){
      this.currentDialog = 1;
    });
    this.stateOnStart(2, function(){
      this.currentDialog = 2;
    })
    this.startAI();


  }
  finishedDialog(){
    this.isTalking = false;
    if(this.currentStateId()==1){
      this.scene.game.player.recieveWeapon(this.weaponToGive);
      console.log("arma conseguida");
      this.goTo(2);
    }
  }

  enemyKilled(){
    this.enemiesLeft --;
    if(this.enemiesLeft<=0)
      this.goTo(1);
  }
}
