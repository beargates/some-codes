export default {
    // 计算两点间的距离
    distance: function ({x: x1, y: y1}, {x: x2, y: y2}) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    },
    getImageData: function ({blob: {url}, meta: {width, height}}) {
        return new Promise((res) => {
            let image = new window.Image();

            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                width = Math.round(width / 2);
                height = Math.round(height / 2);

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(image, 0, 0, width, height);

                const data = ctx.getImageData(0, 0, width, height);

                res(data);
            };

            image.src = url;
        });
    },
    /**
     * 计算一个点沿着旋转中心旋转一定角度后的点的坐标(默认顺时针转)
     * @param x 起点横坐标
     * @param y 起点纵坐标
     * @param o 旋转中心
     * @param rotation 旋转角度
     * @returns {{x: *, y: *}}
     */
    getMappedPoint: function ({x, y}, o, rotation) {
        rotation = rotation % 360;
        const rad = rotation / 360 * Math.PI * 2; // 弧度
        const x1 = (x - o.x) * Math.cos(rad) - (y - o.y) * Math.sin(rad) + o.x;
        const y1 = (x - o.x) * Math.sin(rad) + (y - o.y) * Math.cos(rad) + o.y;
        return {x: x1, y: y1};
    },
    /**
     * 获取像素点的r, g, b, a指定值
     * @param imageData
     * @param x 横坐标
     * @param y 纵坐标
     * @param width 图片实际宽度
     * @returns {*[]}: [$r, $g, $b, $a]
     */
    getRGBA: function ({data, width}, {x, y}) {
        x = Math.floor(x);
        y = Math.floor(y);
        const start = x * 4 + y * 4 * width;
        return [
            data[start],
            data[start + 1],
            data[start + 2],
            data[start + 3],
        ];
    },
}
