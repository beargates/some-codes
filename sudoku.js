/* 九宫数独精简版 */
function getGroup(rowIndex, colIndex, arr) {
    const rowRangeStart = rowIndex - rowIndex % 3;
    const rowRangeEnd = rowRangeStart + 3;
    const colRangeStart = colIndex - colIndex % 3;
    const colRangeEnd = colRangeStart + 3;
    return arr.reduce((pre, row, rowIndex) => {
        return [
            ...pre,
            ...row.filter((num, colIndex) => {
                return rowIndex >= rowRangeStart &&
                    rowIndex < rowRangeEnd &&
                    colIndex >= colRangeStart &&
                    colIndex < colRangeEnd;
            })
        ];
    }, []);
}

function sudoku(board) {
    let resolved = 0;
    let todo = 0;
    let answer = board.map((row, rowIndex) => {
        return row.map((num, colIndex) => {
            let maybe = num;
            if (typeof num === 'number') {
                maybe = [...new Array(board[0].length + 1)].map((v, i) => i);
            }
            if (num === 0 || num.length) {
                todo++;
                let not = Array.from(new Set(board.map(row => row[colIndex]).concat(row)));
                if (board[0].length === 9) {
                    not = not.concat(getGroup(rowIndex, colIndex, board));
                }
                maybe = maybe.filter(num => !not.some(_num => _num === num));
                if (maybe.length === 1) {
                    todo--;
                    resolved++;
                    return maybe[0];
                }
                return maybe;
            }
            return num;
        })
    });
    if (resolved > 0) {
        if (todo > 0) {
            return sudoku(answer);
        } else {
            return answer;
        }
    }
}