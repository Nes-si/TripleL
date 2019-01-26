import React, {Component} from 'react';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import CSSModules from 'react-css-modules';
import {Helmet} from "react-helmet";
import {Parse} from 'parse';

import 'flatpickr/dist/flatpickr.min.css';
import {Russian} from "flatpickr/dist/l10n/ru";
import Flatpickr from 'react-flatpickr';

import {FILE_SIZE_MAX} from 'ConnectConstants';
import {EventData, AGE_LIMITS, AGE_LIMIT_NO_LIMIT, FILTER_DATE_VALUES} from "models/EventData";
import {showAlert, showModal} from "ducks/nav";
import {createEvent} from "ducks/events";
import {getTextDateTime, convertDataUnits, BYTES, M_BYTES, checkFileType, TYPE_IMAGE, filterSpecials} from "utils/common";

import ButtonControl from "components/elements/ButtonControl/ButtonControl";
import InputControl from "components/elements/InputControl/InputControl";
import DropdownControl from "components/elements/DropdownControl/DropdownControl";
import CheckboxControl from 'components/elements/CheckboxControl/CheckboxControl';

import styles from './EventCreateView.sss';


@CSSModules(styles, {allowMultiple: true})
class EventCreateView extends Component {
  state = {
    name: '',
    description: '',
    dateStart: new Date(),
    dateEnd: new Date(),
    dateEndEnabled: false,
    tags: [],
    price: 0,
    ageLimit: AGE_LIMIT_NO_LIMIT,

    image: null,
    imageLoading: false,
    imageError: null
  };

  constructor(props) {
    super(props);

    this.state.dateStart.setDate(this.state.dateStart.getDate() + 1);
    this.state.dateStart.setHours(18, 0, 0, 0);

    this.state.dateEnd.setDate(this.state.dateEnd.getDate() + 1);
    this.state.dateEnd.setHours(19, 0, 0, 0);
  }

  onCreate = () => {
    const event = new EventData();

    event.name        = this.state.name;
    event.description = this.state.description;
    event.dateStart   = this.state.dateStart;
    event.dateEnd     = this.state.dateEndEnabled ? this.state.dateEnd : undefined;
    event.tags        = this.state.tags;
    event.price       = this.state.price;
    event.ageLimit    = this.state.ageLimit;
    event.image       = this.state.image;
    event.owner       = this.props.user.userData;

    const {createEvent} = this.props.eventsActions;
    createEvent(event);
  };

  onChangeName = name => {
    this.setState({name});
  };

  onChangeDescription = event => {
    const description = event.target.value;
    this.setState({description});
  };

  onChangePrice = price => {
    this.setState({price});
  };

  onChangeAgeLimit = ageLimit => {
    this.setState({ageLimit});
  };

  onChangeDateStart = _date => {
    const dateStart = _date[0];
    this.setState({dateStart});
  };

  onChangeDateEnd = _date => {
    const dateEnd = _date[0];
    this.setState({dateEnd});
  };

  onChangeDateEndEnabled = dateEndEnabled => {
    this.setState({dateEndEnabled});
  };

  onImageUpload = async event => {
    const file = event.target.files[0];
    if (!file)
      return;

    if (file.size > FILE_SIZE_MAX) {
      const max = convertDataUnits(FILE_SIZE_MAX, BYTES, M_BYTES);
      const size = convertDataUnits(size, BYTES, M_BYTES);
      this.setState({imageError: `Объём файла (${size} ${M_BYTES}) превышает допустимый (${max} ${M_BYTES})!`});
      return;
    }

    if (checkFileType(file.type) != TYPE_IMAGE) {
      this.setState({imageError: `Необходимо загрузить файл с изображением!`});
      return;
    }

    this.setState({imageLoading: true});

    const parseFile = new Parse.File(filterSpecials(file.name), file, file.type);
    await parseFile.save();

    this.setState({imageLoading: false, image: parseFile});
  };

  validate() {

  }

  render() {
    const imageSrc = this.state.image ? this.state.image.url() : require('assets/images/event-empty.png');

    return (
      <div styleName="EventCreateView">
        <Helmet>
          <title>Новое событие — Triple L</title>
        </Helmet>

        <div styleName="background"></div>
        <div styleName="header">
          <div styleName="title">Новое событие</div>
        </div>

        <div styleName='content'>
          <div styleName='image-container'>
            <div styleName="image"
                 style={{backgroundImage: `url(${imageSrc}`}} />
            <div styleName="upload-button">
              Загрузить изображение
              <input styleName="upload-hidden"
                     type="file"
                     onChange={this.onImageUpload}/>
            </div>
          </div>

          <div styleName="text">
            <div styleName="name">
              <div>Название события:</div>
              <div styleName="name-input">
                <InputControl value={this.state.name}
                              onChange={this.onChangeName} />
              </div>
            </div>

            <div styleName="caption">Описание события:</div>
            <textarea value={this.state.description}
                      styleName="area-description"
                      onChange={this.onChangeDescription} />

            <div styleName="price-and-age">
              <div styleName="price">
                <div>Стоимость участия:</div>
                <div styleName="price-input">
                  <InputControl value={this.state.price}
                                onChange={this.onChangePrice} />
                </div>
                <div styleName="price-units">рублей</div>
              </div>

              <div styleName="age">
                <div>Возрастное ограничение:</div>
                <div styleName="age-dropdown">
                  <DropdownControl list={AGE_LIMITS}
                                   onSuggest={this.onChangeAgeLimit}
                                   current={this.state.ageLimit} />
                </div>
              </div>
            </div>

            <div styleName="date">
              <div styleName="date-start">
                <div>Начало:</div>
                <div styleName="date-picker">
                  <Flatpickr value={this.state.dateStart}
                             options={{
                               locale: Russian,
                               formatDate: getTextDateTime,
                               enableTime: true,
                               time_24hr: true
                             }}
                             onChange={this.onChangeDateStart}/>
                </div>
              </div>
              <div styleName="date-end">
                <CheckboxControl onChange={this.onChangeDateEndEnabled}
                                 checked={this.state.dateEndEnabled} />
                <div styleName={`date-wrapper ${this.state.dateEndEnabled ? '' : 'date-disabled'}`}>
                  <div>Окончание:</div>
                  <div styleName="date-picker">
                    <Flatpickr value={this.state.dateEnd}
                               options={{
                                 locale: Russian,
                                 formatDate: getTextDateTime,
                                 enableTime: true,
                                 time_24hr: true
                               }}
                               onChange={this.onChangeDateEnd}/>
                  </div>
                </div>
              </div>
            </div>

            <div styleName="buttons">
              <div styleName="button-wrapper">
                <ButtonControl onClick={this.onCreate}
                               value="Создать событие"/>
              </div>
              <div styleName="button-wrapper">
                <ButtonControl color="red"
                               onClick={this.validate}
                               value="Отмена"/>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}


function mapStateToProps(state) {
  return {
    events:       state.events,
    user:         state.user,
    serverStatus: state.serverStatus
  };
}

function mapDispatchToProps(dispatch) {
  return {
    eventsActions:bindActionCreators({createEvent}, dispatch),
    navActions:   bindActionCreators({showModal, showAlert}, dispatch)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(EventCreateView);