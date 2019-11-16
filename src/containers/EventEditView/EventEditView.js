import React, {Component} from 'react';
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import CSSModules from 'react-css-modules';
import {Helmet} from "react-helmet";
import {Parse} from 'parse';
import {Link, Prompt} from 'react-router-dom';

import 'flatpickr/dist/flatpickr.min.css';
import {Russian} from "flatpickr/dist/l10n/ru";
import Flatpickr from 'react-flatpickr';

import {DADATA_TOKEN, FILE_SIZE_MAX} from 'config';
import {EventData, AGE_LIMITS, AGE_LIMIT_NO_LIMIT} from "models/EventData";
import {createEvent, updateEvent, showEvent} from "ducks/events";
import {convertDataUnits, BYTES, M_BYTES} from "utils/common";
import {getTextDateTime, filterSpecials} from 'utils/strings';
import {transformDadataAddress, transformDadataCity} from 'utils/data';

import ButtonControl from "components/elements/ButtonControl/ButtonControl";
import InputControl from "components/elements/InputControl/InputControl";
import DropdownControl from "components/elements/DropdownControl/DropdownControl";
import CheckboxControl from 'components/elements/CheckboxControl/CheckboxControl';
import LoaderComponent from 'components/elements/LoaderComponent/LoaderComponent';
import GeoSearchControl, {TYPE_ADDRESS, TYPE_CITY} from "components/elements/GeoSearchControl/GeoSearchControl";

import styles from './EventEditView.sss';


@CSSModules(styles, {allowMultiple: true})
class EventEditView extends Component {
  state = {
    name: '',
    description: '',
    dateStart: new Date(),
    dateEnd: new Date(),
    dateEndEnabled: false,
    tags: [],
    price: 0,
    ageLimit: AGE_LIMIT_NO_LIMIT,

    city: null,
    address: null,
    place: null,
    locationDetails: null,

    loadingCity: false,
    loadingAddress: false,
    loadingPlace: false,

    errorNameRequired: false,
    errorCityRequired: false,
    errorMarkerNull: false,

    image: null,
    imageLoading: false,
    imageError: null,

    dirty: false,

    waitingForCreate: false
  };

  eventId = '';
  event = null;

  mapElm = null;
  cityElm = null;
  addressElm = null;

  map = null;
  marker = null;
  geocoder = null;
  placesService = null;


  constructor(props) {
    super(props);

    const params = new URLSearchParams(this.props.location.search);
    if (params.has('id')) {
      this.eventId = params.get('id');
      const event = props.events.currentEvent;
      if (event && event.origin.id == this.eventId)
        Object.assign(this.state, this.setupEvent(event));
      else
        props.eventsActions.showEvent(this.eventId);

    } else {
      this.event = new EventData();

      this.state.dateStart.setDate(this.state.dateStart.getDate() + 1);
      this.state.dateStart.setHours(18, 0, 0, 0);

      this.state.dateEnd.setDate(this.state.dateEnd.getDate() + 1);
      this.state.dateEnd.setHours(19, 0, 0, 0);

      this.state.city = props.user.userData.location;
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.eventId && !this.event) {
      const event = nextProps.events.currentEvent;
      if (event && event.origin.id == this.eventId) {
        this.setState({...this.setupEvent(event)});
        setTimeout(this.setupGMaps, 1);
      }
    }

    if (this.state.waitingForCreate && this.event.origin && this.event.origin.id)
      this.props.history.push(`/event-${this.event.origin.id}`);
  }

  setupEvent = event => {
    this.event = event;

    let dateEnd = event.dateEnd;
    if (!dateEnd) {
      dateEnd = new Date(event.dateStart);
      dateEnd.setHours(19, 0, 0, 0);
    }

    return {
      name:           event.name,
      description:    event.description,
      dateStart:      event.dateStart,
      dateEnd,
      dateEndEnabled: !!event.dateEnd,
      tags:           event.tags,
      price:          event.price,
      ageLimit:       event.ageLimit,
      image:          event.image,
      place:          event.locationPlace,
      locationDetails:event.locationDetails,
      city:       {main: event.locationCity, cityFias: event.locationCityFias, regionFias: event.locationRegionFias},
      address:    {main: event.locationAddress}
    };
  };

  componentDidMount() {
    if (this.event)
      this.setupGMaps();
  }

  setupGMaps = () => {
    let center = {lat: 55.76, lng: 37.64}; // Москва
    let zoom = 11;
    const {city} = this.state;
    if (city && city.geoLat && city.geoLon)
      center = {lat: city.geoLat, lng: city.geoLon};
    if (this.event.location) {
      center = {lat: this.event.location.latitude, lng: this.event.location.longitude};
      zoom = 19;
    }

    this.map = new google.maps.Map(this.mapElm, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      gestureHandling: 'greedy'
    });

    this.geocoder = new google.maps.Geocoder();

    this.placesService = new google.maps.places.PlacesService(this.map);

    this.map.addListener('click', async event => {
      this.setState({loadingAddress: true, dirty: true});
      if (event.placeId) {
        event.stop();
        this.setState({loadingPlace: true});

        this.placesService.getDetails({placeId: event.placeId}, (place, status) => {
          if (status != 'OK')
            return;

          this.setMarker(place.geometry.location.lat(), place.geometry.location.lng());
          this.setState({place: place.name, loadingPlace: false});
        });

      } else {
        this.setMarker(event.latLng.lat(), event.latLng.lng());
        this.setState({place: ''});
      }
    });

    if (this.event.location)
      this.setMarker(this.event.location.latitude, this.event.location.longitude, false);
  };

  setMarker = (lat, lng, setAddress = true) => {
    if (!this.marker) {
      this.marker = new google.maps.Marker({
        position: {lat, lng},
        map: this.map,
        draggable: true
      });
      this.marker.addListener('dragend', e => {
        this.setState({place: '', dirty: true});
        this.setAddressByCoords(e.latLng.lat(), e.latLng.lng());
      });
      this.setState({errorMarkerNull: false});
    } else {
      this.marker.setPosition({lat, lng});
    }

    if (setAddress)
      this.setAddressByCoords(lat, lng);
  };

  setAddressByCoords = async (lat, lng) => {
    this.setState({loadingAddress: true});
    const URL = `https://suggestions.dadata.ru/suggestions/api/4_1/rs/geolocate/address`;
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Token ${DADATA_TOKEN}`
      },
      body: JSON.stringify({
        lat,
        lon: lng,
        radius_meters: 1000
      })
    });

    const resJson = await res.json();
    const suggestion = resJson.suggestions[0];
    this.setState({loadingCity: false, loadingAddress: false});
    if (!suggestion) {
      this.setState({city: null, address: null});
      this.cityElm.updateValue('');
      this.addressElm.updateValue('');
      return;
    }
    const city = transformDadataCity(suggestion);
    const address = transformDadataAddress(suggestion);
    this.setState({city, address});
    this.cityElm.updateValue(city.main);
    this.addressElm.updateValue(address.main);
  };

  onChangeName = name => {
    this.setState({name, dirty: true, errorNameRequired: false});
  };

  onChangeDescription = event => {
    const description = event.target.value;
    this.setState({description, dirty: true});
  };

  onChangePrice = price => {
    this.setState({price, dirty: true});
  };

  onChangeAgeLimit = ageLimit => {
    this.setState({ageLimit, dirty: true});
  };

  onChangeDateStart = _date => {
    const dateStart = _date[0];
    this.setState({dateStart, dirty: true});
  };

  onChangeDateEnd = _date => {
    const dateEnd = _date[0];
    this.setState({dateEnd, dirty: true});
  };

  onChangeDateEndEnabled = dateEndEnabled => {
    this.setState({dateEndEnabled, dirty: true});
  };

  onChangeCity = city => {
    this.setState({city, address: null, place: '', errorCityRequired: false, dirty: true});
    this.addressElm.updateValue('');

    if (city) {
      this.map.setCenter({lat: city.geoLat, lng: city.geoLon});
      this.map.setZoom(11);
    }
  };

  onChangeAddress = address => {
    if (!address)
      return;

    this.setState({address, place: '', dirty: true});

    if (address.house) {
      this.map.setCenter({lat: address.geoLat, lng: address.geoLon});
      this.map.setZoom(17);
      this.setMarker(address.geoLat, address.geoLon, false);
    }
  };

  onChangePlace = place => {
    this.setState({place, dirty: true});
  };

  onChangeLocDetails = locationDetails => {
    this.setState({locationDetails, dirty: true});
  };

  onImageUpload = async event => {
    const file = event.target.files[0];
    if (!file)
      return;

    if (file.size > FILE_SIZE_MAX) {
      const max = convertDataUnits(FILE_SIZE_MAX, BYTES, M_BYTES);
      const size = convertDataUnits(size, BYTES, M_BYTES);
      this.setState({imageError: `Размер файла (${size} ${M_BYTES}) превышает допустимый (${max} ${M_BYTES})!`});
      return;
    }

    this.setState({imageLoading: true});

    const parseFile = new Parse.File(filterSpecials(file.name), file, file.type);
    await parseFile.save();

    this.setState({imageLoading: false, image: parseFile, dirty: true});
  };

  validate() {
    if (!this.state.name) {
      this.setState({errorNameRequired: true});
      return false;
    }

    if (!this.state.city) {
      this.setState({errorCityRequired: true});
      return false;
    }

    if (!this.marker) {
      this.setState({errorMarkerNull: true});
      return false;
    }

    return true;
  }

  onApply = () => {
    if (!this.validate())
      return;

    this.event.name        = this.state.name;
    this.event.description = this.state.description;
    this.event.dateStart   = this.state.dateStart;
    this.event.dateEnd     = this.state.dateEndEnabled ? this.state.dateEnd : undefined;
    this.event.tags        = this.state.tags;
    this.event.price       = parseInt(this.state.price);
    this.event.ageLimit    = this.state.ageLimit;
    this.event.image       = this.state.image;
    this.event.owner       = this.props.user.userData;
    this.event.members     = [this.props.user.userData];

    const markerPos = this.marker.getPosition();
    this.event.location           = new Parse.GeoPoint(markerPos.lat(), markerPos.lng());
    this.event.locationRegionFias = this.state.city.regionFias;
    this.event.locationCityFias   = this.state.city.cityFias;
    this.event.locationCity       = this.state.city.city;
    this.event.locationAddress    = this.state.address.main;
    this.event.locationPlace      = this.state.place;
    this.event.locationDetails    = this.state.locationDetails;

    const {createEvent, updateEvent} = this.props.eventsActions;
    if (this.eventId) {
      updateEvent(this.event);
      this.setState({dirty: false},
        () => this.props.history.push(`/event-${this.event.origin.id}`));
    } else {
      createEvent(this.event);
      this.setState({waitingForCreate: true, dirty: false});
    }
  };

  render() {
    if (!this.event)
      return <LoaderComponent />;

    const imageSrc = this.state.image ? this.state.image.url() : require('assets/images/event-empty.png');

    const errorRequired = this.state.errorNameRequired || this.state.errorCityRequired;

    const title = this.eventId ? 'Изменение события' : 'Новое событие';

    return (
      <div styleName="EventEditView">
        <Helmet>
          <title>{title} — BrainyDo</title>
        </Helmet>

        <Prompt when={this.state.dirty}
                message="У вас остались несохранённые изменения. Покинуть страницу?" />

        <div styleName="background"></div>
        <div styleName="header">
          <div styleName="title">{title}</div>
        </div>

        <div styleName='content'>
          <div styleName='image-container'>
            <div styleName="image"
                 style={{backgroundImage: `url(${imageSrc}`}} />
            <div styleName="upload-button">
              Загрузить изображение
              <input styleName="upload-hidden"
                     type="file"
                     accept="image/jpeg,image/png,image/gif"
                     onChange={this.onImageUpload}/>
            </div>
            {this.state.imageLoading &&
              <div styleName="image-loading">
                <LoaderComponent/>
              </div>
            }
          </div>

          <div styleName="text">
            <div styleName="inline">
              <div>Название:</div>
              <div styleName="input-wrapper">
                <InputControl value={this.state.name}
                              autoFocus
                              red={this.state.errorNameRequired}
                              onChange={this.onChangeName} />
              </div>
            </div>

            <div styleName="caption">Описание:</div>
            <textarea value={this.state.description}
                      styleName="area-description"
                      onChange={this.onChangeDescription} />

            <div styleName="price-and-age">
              <div styleName="inline">
                <div>Стоимость участия:</div>
                <div styleName="price-input">
                  <InputControl value={this.state.price}
                                onChange={this.onChangePrice} />
                </div>
                <div styleName="price-units">рублей</div>
              </div>

              <div styleName="inline">
                <div>Возрастное ограничение:</div>
                <div styleName="age-dropdown">
                  <DropdownControl list={AGE_LIMITS}
                                   onSuggest={this.onChangeAgeLimit}
                                   current={this.state.ageLimit} />
                </div>
              </div>
            </div>

            <div styleName="date">
              <div styleName="inline">
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
              <div styleName="inline">
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

            <div styleName="location">
              <div styleName="title">Место проведения</div>
              <div styleName="inline top-margin">
                <div>Город:</div>
                <div styleName="input-wrapper">
                  <GeoSearchControl ref={elm => this.cityElm = elm}
                                    type={TYPE_CITY}
                                    sendNull
                                    placeholder="Введите первые буквы города"
                                    value={this.state.city ? this.state.city.main : null}
                                    showLoader={this.state.loadingCity}
                                    onChange={this.onChangeCity} />
                </div>
              </div>

              <div styleName="inline top-margin">
                <div>Адрес:</div>
                <div styleName="input-wrapper">
                  <GeoSearchControl ref={elm => this.addressElm = elm}
                                    type={TYPE_ADDRESS}
                                    sendNull
                                    placeholder="Введите начало адреса"
                                    value={this.state.address ? this.state.address.main : null}
                                    city={this.state.city}
                                    showLoader={this.state.loadingAddress}
                                    onChange={this.onChangeAddress} />
                </div>
              </div>

              <div styleName="inline top-margin">
                <div>Место:</div>
                <div styleName="input-wrapper">
                  <InputControl onChange={this.onChangePlace}
                                showLoader={this.state.loadingPlace}
                                value={this.state.place} />
                </div>
              </div>

              <div styleName="map" ref={elm => this.mapElm = elm}></div>

              <div styleName="top-margin">
                <div>Дополнительная информация:</div>
                <div styleName="input-wrapper">
                  <InputControl onChange={this.onChangeLocDetails}
                                value={this.state.locationDetails} />
                </div>
              </div>
            </div>

            <div styleName="buttons">
              <div styleName="button-wrapper">
                <ButtonControl onClick={this.onApply}
                               value={this.eventId ? "Изменить событие" : "Создать событие"}/>
              </div>
              <div styleName="button-wrapper">
                <Link to="/dashboard">
                  <ButtonControl color="red"
                                 value="Отмена" />
                </Link>
              </div>
            </div>

            {errorRequired &&
              <div styleName="error">Необходимо заполнить обязательные поля!</div>
            }
            {this.state.errorMarkerNull &&
              <div styleName="error">Необходимо выбрать место проведения!</div>
            }

          </div>
        </div>

        {this.state.waitingForCreate &&
          <div styleName="loader">
            <LoaderComponent/>
          </div>
        }
      </div>
    );
  }
}


function mapStateToProps(state) {
  return {
    events: state.events,
    user:   state.user
  };
}

function mapDispatchToProps(dispatch) {
  return {
    eventsActions:bindActionCreators({createEvent, updateEvent, showEvent}, dispatch)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(EventEditView);