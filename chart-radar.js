// var mW = 400;
// var mH = 400;
// var mData = [['速度', 77],
//   ['力量', 72],
//   ['防守', 46],
//   ['射门', 50],
//   ['传球', 80],
//   ['耐力', 60]];
// var mColorPolygon = '#B8B8B8'; //多边形颜色
// var mColorLines = '#B8B8B8'; //顶点连线颜色
// var mColorText = '#000000';
/**
 * 基于canvas的雷达图
 * 注：目前仅支持3/4/5边（2018-8-2）
 */
/* eslint-disable max-lines*/
export default class Radar {
    constructor({canvasEl, width, height, data, colorPolygon, colorLine, colorText}) {
      this.canvasEl = canvasEl;
      this.ratio = 2; // 放大响应倍数，解决绘图不清晰问题
      this.mW = width * this.ratio;
      this.mH = height * this.ratio;
      this.mData = data;
      this.mold = (new Array(5)).fill(''); // 固定画五条边(背景)
      this.mCount = this.mData.length; //边数
      this.mCenter = {
        x: this.mW / 2,
        y: this.mH / 2,
      }; //中心点
      this.mRadius = Math.min(this.mCenter.x, this.mCenter.y) - 100; //半径(减去的值用于给绘制的文本留空间)
      this.rotation = -Math.PI / 2; // 矫正角度，决定了第一组数据在哪个方向上显示
      this.mAngle = Math.PI * 2 / this.mCount; //角度
      this.maxCountEachLine = 8; // label每行最多字数（可以考虑换成宽度）
      this.mCtx = null;
      this.mColorPolygon = colorPolygon; //多边形颜色
      this.mColorLines = colorLine; //顶点连线颜色
      this.mColorText = colorText;

      this.canvasEl.height = this.mH;
      this.canvasEl.width = this.mW;
      this.mCtx = this.canvasEl.getContext('2d');

      this.drawPolygon(this.mCtx);
      this.drawLines(this.mCtx);
      this.drawText(this.mCtx);
      this.drawRegion(this.mCtx);
      this.drawCircle(this.mCtx);
    }

    /**
     * str:要绘制的字符串
     * canvas:canvas上下文对象
     * initX:绘制字符串起始x坐标
     * initY:绘制字符串起始y坐标
     * lineHeight:字行高，自己定义个值即可
     */
    canvasTextAutoLine(str, canvas, initX, initY, lineHeight) {
      const ctx = canvas.getContext("2d");
      // const canvasWidth = canvas.width;
      // let lineWidth = 0;
      // let lastSubStrIndex = 0;
      // 溢出canvas边界自动换行
      // for (let i = 0; i < str.length; i++) {
      //   lineWidth += ctx.measureText(str[i]).width;
      //   if (lineWidth > canvasWidth - initX) { // 减去initX,防止边界出现的问题
      //     ctx.fillText(str.substring(lastSubStrIndex, i), initX, initY);
      //     initY += lineHeight;
      //     lineWidth = 0;
      //     lastSubStrIndex = i;
      //   }
      //   if (i === str.length - 1) {
      //     ctx.fillText(str.substring(lastSubStrIndex, i + 1), initX, initY);
      //   }
      // }
      let totalWidth = initX;
      let totalLines = 1;
      str.split('').forEach((item, index) => {
        if (index > 0 && index % this.maxCountEachLine === 0) { // 每四个字换一行
          totalWidth = initX; // 换行后当前行的totalWidth要重新计算
          totalLines++;
        }
        const itemWidth = ctx.measureText(item).width;
        ctx.fillText(item, totalWidth, initY + totalLines * lineHeight);
        totalWidth += itemWidth;
      });
    }

    // 绘制多边形边
    drawPolygon(ctx) {
      ctx.save();

      ctx.strokeStyle = this.mColorPolygon;
      ctx.lineWidth = 2 * this.ratio;
      const r = this.mRadius / this.mold.length; //单位半径
      //画5个圈
      this.mold.forEach((item, i) => {
        ctx.beginPath();
        const currR = r * (i + 1); //当前半径
        //画5条边
        this.mold.forEach((item, index) => {
          const x = this.mCenter.x + currR * Math.cos(this.mAngle * index + this.rotation);
          const y = this.mCenter.y + currR * Math.sin(this.mAngle * index + this.rotation);

          ctx.lineTo(x, y);
        });

        ctx.closePath();

        if (i === 0) {
          ctx.fillStyle = 'rgba(255, 226, 228, 0.6)'; // 最内闭合区域填充色
          ctx.fill();
        } else {
          ctx.stroke(); // 最内部的闭合区域不描边
        }
      });

      ctx.restore();
    }

    //顶点连线
    drawLines(ctx) {
      ctx.save();

      ctx.beginPath();
      ctx.strokeStyle = this.mColorLines;
      ctx.lineWidth = 2 * this.ratio;

      this.mData.forEach((item, i) => {
        const x = this.mCenter.x + this.mRadius * Math.cos(this.mAngle * i + this.rotation);
        const y = this.mCenter.y + this.mRadius * Math.sin(this.mAngle * i + this.rotation);

        ctx.moveTo(this.mCenter.x, this.mCenter.y);
        ctx.lineTo(x, y);
      });

      ctx.stroke();

      ctx.restore();
    }

    /**
     * 数据的点的坐标
     * @param angle
     * @param percent
     * @returns {{x: *, y: *}}
     */
    getPointPosition(angle, percent = 1) {
      return {
        x: this.mCenter.x + this.mRadius * Math.cos(angle) * percent,
        y: this.mCenter.y + this.mRadius * Math.sin(angle) * percent
      };
    }

    /**
     * 纠正label的实际位置
     * @param text 文本
     * @param x 本来位置
     * @param y 本来位置
     * @param angle
     */
    correctLabelPosition(text, x, y, angle) {
      const fontSize = 36;
      const lineHeight = 54;
      const marginRight = 10 * this.ratio;
      const lines = Math.ceil(text.length / this.maxCountEachLine);
      const textWidth = Math.min(fontSize * this.maxCountEachLine, this.mCtx.measureText(text).width);
      angle = (angle + Math.PI * 2) % (Math.PI * 2); // 纠正角度，使其在0-360范围内

      // 三边/五边
      if (angle > 0 && angle < Math.PI / 2) { // 0-90deg
        x -= textWidth / 2;
      } else if (angle > Math.PI / 2 && angle < Math.PI) { //90-180deg
        x -= textWidth / 2 + marginRight;
      } else if (angle > Math.PI && angle < Math.PI * 3 / 2) { // 180-270deg
        x -= textWidth + marginRight; // 水平剧中
        y -= lineHeight * lines / 2 + marginRight;
      } else if (angle > Math.PI * 3 / 2) { // 270deg+
        x += marginRight;
        y -= lineHeight * lines;
      }
      // 四边
      switch (angle) {
        case 0:
          x += marginRight;
          // y -= lineHeight * lines / 2;
          y -= lineHeight * lines / 2 + fontSize / 2;
          break;
        // 90度
        case Math.PI / 2:
          x -= textWidth / 2;
          break;
        // 180度
        case Math.PI:
          x -= textWidth + marginRight;
          y -= lineHeight * lines / 2 + fontSize / 2;
          break;
        // 270度
        case Math.PI * 3 / 2:
          x -= textWidth / 2; // 水平剧中
          y -= lineHeight * lines + marginRight;
          break;
        default:
          break;
      }
      return {x, y};
    }

    /**
     * 纠正数据文字的实际位置
     * @param text 文本
     * @param x 本来位置
     * @param y 本来位置
     * @param angle
     */
    correctDataPosition(text, x, y, angle) {
      const fontSize = 24;
      const lineHeight = 36;
      const marginRight = 10 * this.ratio;
      const lines = Math.ceil(text.length / this.maxCountEachLine);
      const textWidth = Math.min(fontSize * this.maxCountEachLine, this.mCtx.measureText(text).width);
      angle = (angle + Math.PI * 2) % (Math.PI * 2); // 纠正角度，使其在0-360范围内

      // 三边/五边
      if (angle > 0 && angle < Math.PI / 2) { // 0-90deg
        x += marginRight;
        y -= lineHeight * lines * 1.8;
      } else if (angle > Math.PI / 2 && angle < Math.PI) { //90-180deg
        x -= textWidth + marginRight;
        y -= lineHeight * lines * 1.8;
      } else if (angle > Math.PI && angle < Math.PI * 3 / 2) { // 180-270deg
        x -= textWidth + marginRight; // 水平剧中
        y -= lineHeight * lines / 2 + marginRight;
      } else if (angle > Math.PI * 3 / 2) { // 270deg+
        x += marginRight;
        y -= lineHeight * lines;
      }
      // 四边
      switch (angle) {
        case 0:
          x += marginRight;
          // y -= lineHeight * lines / 2;
          y -= lineHeight * lines / 2 + fontSize;
          break;
        // 90度
        case Math.PI / 2:
          x -= textWidth / 2;
          break;
        // 180度
        case Math.PI:
          x -= textWidth + marginRight;
          y -= lineHeight * lines / 2 + fontSize;
          break;
        // 270度
        case Math.PI * 3 / 2:
          x -= textWidth / 2; // 水平剧中
          y -= lineHeight * lines * 1.8 + marginRight;
          break;
        default:
          break;
      }
      return {x, y};
    }

    // 绘制文本
    drawText(ctx) {
      ctx.save();

      const lineHeight = 54;

      this.mData.forEach((item, i) => {
        const angle = this.mAngle * i + this.rotation;
        // 画端点上的说明文字
        ctx.fillStyle = this.mColorText;
        ctx.font = 'normal normal 100 36px sans-serif';
        const label = this.mData[i][0];
        let position = this.getPointPosition(angle);
        position = this.correctLabelPosition(label, position.x, position.y, angle);
        this.canvasTextAutoLine(label, this.canvasEl, position.x, position.y, lineHeight);

        // 画数据文字
        ctx.fillStyle = '#f45';
        ctx.font = 'normal normal 100 24px sans-serif';
        const percent = this.mData[i][1]; // 如：80，而不是.8或者80%
        position = this.getPointPosition(angle, percent / 100);
        // 修正4边时数据文字的初始位置
        if (percent > 80) {
          let _angle = (angle + Math.PI * 2) % (Math.PI * 2);
          if (_angle === Math.PI / 2) {
            position.x += lineHeight;
            position.y -= lineHeight;
          }
          if (_angle === Math.PI * 3 / 2) {
            position.x += lineHeight;
            position.y += lineHeight;
          }
          if (_angle === 0 || _angle === Math.PI) {
            position.y += lineHeight;
          }
        }
        position = this.correctDataPosition(`${percent}%`, position.x, position.y, angle);
        this.canvasTextAutoLine(`${percent}%`, this.canvasEl, position.x, position.y, lineHeight);
      });

      ctx.restore();
    }

    // 绘制数据区域
    drawRegion(ctx) {
      ctx.save();

      ctx.beginPath();
      ctx.lineWidth = 2 * this.ratio;

      let firstPoint = null;
      this.mData.forEach((item, i) => {
        const angle = this.mAngle * i + this.rotation;
        const percent = item[1] / 100;
        const point = this.getPointPosition(angle, percent);
        if (i === 0) {
          firstPoint = point;
        }

        ctx.lineTo(point.x, point.y);
      });

      // ctx.closePath();
      // 绘制起点到终点的线，如果使用closePath闭合，在chrome上有些线绘制不出来
      // 比如A->B->A->C，使用closePath，A->C的线画不出来
      if (firstPoint) {
        ctx.lineTo(firstPoint.x, firstPoint.y);
      }
      ctx.strokeStyle = '#f45';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 102, 102, .5)';
      ctx.fill();

      ctx.restore();
    }

    // 画点
    drawCircle(ctx) {
      ctx.save();

      this.mData.forEach((item, i) => {
        const angle = this.mAngle * i + this.rotation;
        const percent = item[1] / 100;
        const {x, y} = this.getPointPosition(angle, percent);

        ctx.beginPath();
        ctx.arc(x, y, 4 * this.ratio, 0, Math.PI * 2);
        ctx.fillStyle = '#f45'; // rgb颜色在safari上渲染的是黑色
        ctx.fill();
      });

      ctx.restore();
    }
  }
  /* eslint-enable */
