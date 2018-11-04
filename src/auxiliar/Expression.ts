class Expression {


    static fromString(str:string) : Expression
    {
//        console.log("Expression.fromString " + str);
        return Expression.fromStringOffset(str, 0)[0];
    }


    static fromStringOffset(str:string, pos:number) : [Expression, number]
    {
        var pos0:number = pos;

        var tmp:[string,number] = Expression.nextToken(str, pos);
        if (tmp==null) return null;
        var token:string = tmp[0];
        pos = tmp[1];
        var stack:Expression[] = [];
        var last:Expression = null;
        var current:Expression = null;

        while(token!=null) {
//            console.log("next token: " + token + ", offset " + pos);
            if (Expression.isSymbol(token)) {
                last = new Expression();
                last.head = token;
                if (current!=null) current.parameters.push(last);

                if (token == "new") {
                    var tmp2:[Expression,number] = Expression.fromStringOffset(str, pos);
                    if (tmp2!=null) {
                        pos = tmp2[1];
                        last.parameters.push(tmp2[0]);
                    } else {
                        console.error("Expression.from_string: illegal expression after 'new': " + str.substring(pos0));
                        break;
                    }
                    if (stack.length==0) return [last,pos];
                }
            } else if (token.charAt(0)=='(') {
                if (last!=null) {
                    stack.push(last);
                    current = last;
                } else {
                    console.error("Expression::from_string: illegal expression '(': " + str.substring(pos0));
                    break;
                }
            } else if (token.charAt(0)==')') {
                stack.splice(stack.length-1,1);
                if (stack.length>0) {
                    current = stack[stack.length-1];
                } else {
                    return [current,pos];
                }
            } else if (token.charAt(0)==',') {
                // ... (ignore for now)
            } else if (token.charCodeAt(0)>='0'.charCodeAt(0) && token.charCodeAt(0)<='9'.charCodeAt(0)) {
                last = new Expression();
                last.head = token;
                if (current!=null) current.parameters.push(last);
            } else if (token.charAt(0)=='?') {
                last = new Expression();
                last.head = token;
                if (current!=null) current.parameters.push(last);
            } else if (token.charAt(0)=='\'' || token.charAt(0)=='\"') {
                token = token.substring(1,token.length-1);    // remove the quotes
                last = new Expression();
                last.head = token;
                last.quoted = true;
                if (current!=null) current.parameters.push(last);
            } else {
                console.error("Expression::from_string: unrecognized token: " + token);
                break;
            }

            tmp = Expression.nextToken(str,pos);
            if (tmp==null) break;
            token = tmp[0];
            pos = tmp[1];
        }

        console.error("Expression.from_string: illegal expression start: " + str.substring(pos0));
        return [null,pos];
    }


    static listFromString(str:string) : Expression[]
    {
        return Expression.listFromStringOffset(str, 0)[0]
    }


    static listFromStringOffset(str:string, pos:number) : [Expression[], number]
    {
        var l:Expression[] = [];

        while(pos<str.length) {
            var tmp:[Expression,number] = Expression.fromStringOffset(str, pos); 
            if (tmp!=null) {
                l.push(tmp[0]);
                pos = tmp[1];
            } else {
                return [l,pos];
            }
            while(str.charAt(pos)==' ' || str.charAt(pos)==',') pos++;
        }
        return [l,pos];
    }


    static nextToken(str:string, pos:number) : [string, number]
    {
        var buffer:string = "";

        // skip spaces:
        var c:string = str.charAt(pos);
        pos++;
        while(c==' ' || c=='\t') {
            c = str.charAt(pos);
            pos++;
        }

        // determine token type:
        if (c=='') {
            return null;
        } else if (c==',' || c=='(' || c==')') {
            return [c,pos];
        } else if (c=='\"') {
            buffer += c;
            c = str.charAt(pos);
            pos++;
            while(c!='\"') {
                buffer += c;
                c = str.charAt(pos);
                pos++;
            }
            buffer+='\"';
            return [buffer,pos];
        } else if (c=='\'') {
            buffer += c;
            c = str.charAt(pos);
            pos++;
            while(c!='\'') {
                buffer += c;
                c = str.charAt(pos);
                pos++;
            }
            buffer+='\"';
            return [buffer,pos];
        } else if (Expression.isSymbolStartCharacter(c.charCodeAt(0))) {
            while(Expression.isSymbolCharacter(c.charCodeAt(0))) {
                buffer += c;
                c = str.charAt(pos);
                pos++;
            }
            pos--;
            return [buffer,pos];
        } else if (c.charCodeAt(0)>='0'.charCodeAt(0) && c.charCodeAt(0)<='9'.charCodeAt(0)) {
            while((c.charCodeAt(0)>='0'.charCodeAt(0) && c.charCodeAt(0)<='9'.charCodeAt(0)) || c.charCodeAt(0)=='.'.charCodeAt(0)) {
                buffer += c;
                c = str.charAt(pos);
                pos++;
            }
            pos--;
            return [buffer,pos];
        } else if (c=='&' &&
                   str.charAt(pos)=='q' &&
                   str.charAt(pos+1)=='u' &&
                   str.charAt(pos+2)=='o' &&
                   str.charAt(pos+3)=='t' &&
                   str.charAt(pos+4)==';') {
            pos+=5;
            buffer +='\"';
            c = str.charAt(pos);
            pos++;
            while(c!='&') {
                buffer += c;
                c = str.charAt(pos);
                pos++;
            }
            buffer +='\"';
            pos+=5;    // skip the "quot;"
            return [buffer,pos];
        } else if (c=='?') {
            buffer += c;
            c = str.charAt(pos);
            pos++;
            while(c.charCodeAt(0)>='0'.charCodeAt(0) && c.charCodeAt(0)<='9'.charCodeAt(0)) {
                buffer += c;
                c = str.charAt(pos);
                pos++;
            }
            pos--;
            return [buffer,pos];
        } else {
            console.error("Expression.next_token: Token starts with illegal character '" + c + "'");
            return null;
        }
    }


    static isSymbol(token:string) : boolean
    {
        return Expression.isSymbolStartCharacter(token.charCodeAt(0));
    }


    static isSymbolCharacter(c:number) : boolean
    {
        return (c>='a'.charCodeAt(0) && c<='z'.charCodeAt(0)) || 
               (c>='A'.charCodeAt(0) && c<='Z'.charCodeAt(0)) || 
               c=='.'.charCodeAt(0) || 
               c=='_'.charCodeAt(0) || 
               c=='-'.charCodeAt(0) || 
               (c>='0'.charCodeAt(0) && c<='9'.charCodeAt(0)) || 
               c==':'.charCodeAt(0);
    }


    static isSymbolStartCharacter(c:number) : boolean
    {
        return (c>='a'.charCodeAt(0) && c<='z'.charCodeAt(0)) || 
               (c>='A'.charCodeAt(0) && c<='Z'.charCodeAt(0)) || 
                c=='_'.charCodeAt(0);
    }



    toString()
    {
        var s:string = (this.quoted ? "\"" + this.head + "\"":this.head);
        if (this.parameters.length>0) {
            s += "(";
            for(let i:number = 0;i<this.parameters.length;i++) {
                if (i>0) s+=",";
                s += this.parameters.toString();
            }
            s += ")";
        }
        return s;
    }



    head:string = null;
    quoted:boolean = false;
    parameters:Expression[] = [];
}

