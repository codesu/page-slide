import page from '../../../../js/page';
import { $, renderContent } from '../../../../util/util';
import './index.less';

import cloudUp from './img/cloud-up.png';
import cloudDown from './img/cloud-down.png';
import img01 from './img/01.jpg';
import img03 from './img/03.png';
import img04 from './img/04.png';
import img05 from './img/05.png';

const imgList = [img01, cloudUp, cloudDown, img03, img04, img05];

$('.ballon-page__container--bg').src = img01;

page.addPage({
    enter: 'enter',
    node: $('.ballon-page'),
    exit: 'exit',
    timeout: {
        exit: 2000
    }
}, imgList);

export default function setBallonPageData() {}
