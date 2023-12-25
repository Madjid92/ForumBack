export  interface Session  {
    login : string;
    experationDate : Date;
}

export interface Sessions {
    [key: string]: Session
}

