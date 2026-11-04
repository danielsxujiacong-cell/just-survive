export type Bag=Record<string,number>;
export type Item={name:string;weight:number;kind:string;recipe?:Bag;facility?:string;level?:number;hours?:number;power?:number;range?:number;ammo?:string;heal?:Partial<Stats>};
export type Stats={hp:number;hunger:number;water:number;external:number;internal:number;spirit:number};
export type Zone={id:number;name:string;x:number;y:number;hours:number;resources:string[];enemies:string[];boss:string;story:string};
export type Enemy={name:string;hp:number;attack:number;range:number;poison?:boolean};
export type Battle={enemy:Enemy;hp:number;distance:number;turn:number;wolfCD:number;stun:number;bleed:number;message:string};
export type State={version:1;time:number;location:number;selected:number;stats:Stats;bag:Bag;storage:Bag;facilities:Record<string,number>;fence:number;progress:number[];equipment:{melee:string;ranged:string;armor:string;tool:string};weather:string;logs:string[];battle:Battle|null;puzzle:boolean;board:boolean[];moves:number;puzzleDone:boolean;lab:boolean;volcano:boolean;eruption:number;blueprint:boolean;pearls:number[];wolfFound:boolean;wolfMeat:number;wolfBandage:number;wolf:number;camelFound:boolean;camel:boolean;kuru:boolean;friendship:number;canoe:boolean;ending:string|null;kills:number;crafted:number;seed:number;rescues:number};
