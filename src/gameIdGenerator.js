let alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z','1','2','3','4','5','6','7','8','9','0']
export function generateGameId() {
    let gameId = ''
    for (let i = 0; i < 5; i++) {
        gameId +=  alphabet[Math.floor(Math.random() * alphabet.length)];      
    }
    return gameId
}